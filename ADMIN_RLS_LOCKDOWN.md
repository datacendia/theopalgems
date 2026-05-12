# Admin Tables — RLS Lockdown

## Why

Until this audit, the admin UI used the **anon** Supabase key (the one
bundled into the public JS) to read and write every admin table directly.
This meant the admin "login" only gated the UI; anyone with the URL +
anon key (everyone) could hit Supabase from outside the app.

We now route every admin DB operation through `/api/admin-data`, which:

1. Verifies the admin JWT issued by `/api/admin-login`.
2. Uses the **service** Supabase key (server-only env var) to perform the
   query. The service key bypasses RLS by design.

That means we can — and **must** — set RLS to deny all anon access on
every admin table.

---

## Two policy patterns

We have two kinds of admin tables:

1. **Public-readable, admin-writable** — content displayed on the public site:
   `watches`, `products`, `locations`, `sections`, `photos`, `testimonials`.
   Anyone can SELECT; only the service key (Netlify Functions) can write.

2. **Locked down completely** — sensitive data:
   `subscribers`, `newsletter_campaigns`, `newsletter_sends`.
   Nothing anon can do; everything goes through Netlify Functions.

The service key always bypasses RLS, so server-side code keeps working in
both cases.

## SQL — run in Supabase SQL Editor

Run this once. Idempotent.

```sql
-- ── PUBLIC-READABLE TABLES ──
-- Anyone can SELECT (so the marketing site works without a logged-in user),
-- but no anon role can INSERT/UPDATE/DELETE. Admin writes go through
-- /api/admin-data which uses the service key.

do $$
declare
  t text;
begin
  for t in select unnest(array['watches','products','locations','sections','photos','testimonials']) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Public read"   on public.%I', t);
    execute format('drop policy if exists "Block writes"  on public.%I', t);
    -- Legacy single policy from earlier setup, drop if present
    execute format('drop policy if exists "Service role only" on public.%I', t);

    execute format('create policy "Public read"  on public.%I for select using (true)', t);
    execute format('create policy "Block writes" on public.%I for all    using (false) with check (false)', t);
  end loop;
end$$;

-- ── LOCKED-DOWN TABLES ──
-- Nothing anon can do. Service key only.

alter table public.subscribers enable row level security;
drop policy if exists "Service role only" on public.subscribers;
drop policy if exists "Public read" on public.subscribers;
drop policy if exists "Block writes" on public.subscribers;
create policy "Service role only" on public.subscribers for all using (false) with check (false);

-- Newsletter campaigns + sends (only relevant if you ran the optional tables)
do $$
begin
  if to_regclass('public.newsletter_campaigns') is not null then
    alter table public.newsletter_campaigns enable row level security;
    drop policy if exists "Service role only" on public.newsletter_campaigns;
    create policy "Service role only" on public.newsletter_campaigns for all using (false) with check (false);
  end if;
  if to_regclass('public.newsletter_sends') is not null then
    alter table public.newsletter_sends enable row level security;
    drop policy if exists "Service role only" on public.newsletter_sends;
    create policy "Service role only" on public.newsletter_sends for all using (false) with check (false);
  end if;
end$$;
```

> **If `testimonials` table doesn't exist**, the loop will fail. Either
> create it first or remove `'testimonials'` from the array. Testimonials
> currently live inside the `sections` table (`sections.testimonials`),
> so a separate table may not be needed.

---

## Verify

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'subscribers','watches','products','locations','sections','photos',
    'testimonials','newsletter_campaigns','newsletter_sends'
  );
```

`rowsecurity` should be `true` for every row. Then check the policies:

```sql
select tablename, policyname, qual
from pg_policies
where schemaname = 'public'
order by tablename;
```

Every entry should have `qual = false` (i.e. `using (false)`).

---

## Required environment variables

Make sure all three are set on Netlify:

| Variable                | Used by                                              |
| ----------------------- | ---------------------------------------------------- |
| `SUPABASE_URL`          | All Netlify Functions                                 |
| `SUPABASE_SERVICE_KEY`  | All Netlify Functions (NEVER expose to the browser)  |
| `ADMIN_JWT_SECRET`      | `admin-login.mjs` + `admin-data.mjs`                 |
| `ADMIN_PASSWORD`        | `admin-login.mjs`                                     |
| `ALLOWED_ORIGIN`        | All Netlify Functions (defaults to https://theopalgems.com) |
| `RESEND_API_KEY`        | `subscribe.mjs`, `confirm.mjs`, send-* scripts        |
| `RESEND_FROM_EMAIL`     | Same                                                  |
| `SITE_URL`              | `subscribe.mjs`, `confirm.mjs`, send-* scripts        |

The browser only ever sees `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
(via `import.meta.env`). The anon key is now harmless because RLS denies
all access to admin tables; it can still be used by the public
`subscribe.mjs` flow because that endpoint also uses the service key.

---

## Storage bucket (`GALLERY`)

The photo upload still uses the client-side Supabase client because the
bucket has its own ACL system. To prevent anonymous tampering:

1. In Supabase Dashboard → Storage → `GALLERY` → Policies, ensure that
   `INSERT`, `UPDATE`, `DELETE` are restricted to authenticated /
   service-role users only.
2. Keep `SELECT` (read) open if the bucket is meant to be publicly
   readable for the site's photos.

If you want full server-side gating on storage too, replace
`uploadPhoto` and the storage `remove([filePath])` call inside
`deletePhoto` with a Netlify Function that uses the service key.

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

## SQL — run in Supabase SQL Editor

Run this once. Idempotent.

```sql
-- Subscribers (already locked down per SUBSCRIBE_SETUP.md, included for completeness)
alter table public.subscribers enable row level security;
drop policy if exists "Service role only" on public.subscribers;
create policy "Service role only" on public.subscribers for all using (false);

-- Watches
alter table public.watches enable row level security;
drop policy if exists "Service role only" on public.watches;
create policy "Service role only" on public.watches for all using (false);

-- Products (necklaces, rings, earrings, bracelets)
alter table public.products enable row level security;
drop policy if exists "Service role only" on public.products;
create policy "Service role only" on public.products for all using (false);

-- Locations
alter table public.locations enable row level security;
drop policy if exists "Service role only" on public.locations;
create policy "Service role only" on public.locations for all using (false);

-- Homepage sections
alter table public.sections enable row level security;
drop policy if exists "Service role only" on public.sections;
create policy "Service role only" on public.sections for all using (false);

-- Photo gallery rows
alter table public.photos enable row level security;
drop policy if exists "Service role only" on public.photos;
create policy "Service role only" on public.photos for all using (false);

-- Testimonials (if you have a separate table; safe to skip if testimonials live inside sections)
alter table public.testimonials enable row level security;
drop policy if exists "Service role only" on public.testimonials;
create policy "Service role only" on public.testimonials for all using (false);

-- Newsletter campaigns + sends (if you ran the optional newsletter tables)
alter table public.newsletter_campaigns enable row level security;
drop policy if exists "Service role only" on public.newsletter_campaigns;
create policy "Service role only" on public.newsletter_campaigns for all using (false);

alter table public.newsletter_sends enable row level security;
drop policy if exists "Service role only" on public.newsletter_sends;
create policy "Service role only" on public.newsletter_sends for all using (false);
```

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

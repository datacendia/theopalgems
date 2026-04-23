# Email Subscription Setup — Action Required

The subscribe form now posts to a Netlify Function (`/api/subscribe`) that:
1. Saves the email to a `subscribers` table in Supabase
2. Sends a branded confirmation email via Resend

You need to complete **3 steps** before it works in production.

---

## Step 1 — Create `subscribers` table in Supabase

In your Supabase dashboard: **SQL Editor → New query → Paste & Run:**

```sql
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  confirmed boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS but allow the service_role key (used by the function) full access
alter table public.subscribers enable row level security;

-- Block anon/public access entirely; only service_role can read/write
create policy "Service role only" on public.subscribers
  for all using (false);
```

---

## Step 2 — Sign up for Resend

1. Go to https://resend.com and sign up (free — 100 emails/day, 3000/month).
2. **Option A (quick start):** Use their test domain. Leave `RESEND_FROM_EMAIL` unset or use `"Opal Gems <onboarding@resend.dev>"`. Emails will send but come from `onboarding@resend.dev`.
3. **Option B (professional — recommended):** Add & verify `theopalgems.com` in Resend → Domains. You'll add DNS records in your domain registrar. Once verified, set `RESEND_FROM_EMAIL="Opal Gems <hello@theopalgems.com>"`.
4. Dashboard → API Keys → Create API Key → copy the `re_xxxx` key.

---

## Step 3 — Add environment variables in Netlify

In the Netlify dashboard: **Site settings → Environment variables → Add variable.**

Add these four:

| Key | Value |
|---|---|
| `SUPABASE_URL` | (your Supabase project URL, e.g. `https://xxxxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | (your Supabase **service_role** key — Settings → API → `service_role` secret. NEVER put this in `.env` committed to frontend code) |
| `RESEND_API_KEY` | `re_xxxx...` (from Step 2) |
| `RESEND_FROM_EMAIL` | `Opal Gems <hello@theopalgems.com>` (or leave unset to use Resend's test domain) |

After adding, **trigger a fresh deploy** so the function picks up the env vars:
```bash
netlify deploy --prod --dir=dist
```

---

## Step 4 — Test

1. Open https://theopalgems.com
2. Enter your email in the footer subscribe box → click Subscribe
3. You should see a green success message
4. Check your inbox for the "Welcome to Opal Gems" email
5. Check Supabase → `subscribers` table → your email should be there

---

## Troubleshooting

- **"Something went wrong" error:** Check Netlify → Logs → Functions → `subscribe` for the actual error.
- **Success but no email received:** Usually means `RESEND_API_KEY` is missing or invalid. Check function logs.
- **"onboarding@resend.dev" in from address:** You haven't set `RESEND_FROM_EMAIL`, or your custom domain isn't verified in Resend yet.
- **Duplicate email:** The function treats re-subscribing as success and re-sends the welcome email. No error shown to user.

## Viewing subscribers

Supabase dashboard → Table Editor → `subscribers`.

Or run this in SQL Editor for a simple export:
```sql
select email, source, created_at from subscribers order by created_at desc;
```

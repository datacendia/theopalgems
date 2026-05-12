# Subscriber Profile Fields — Migration

Adds three optional profile fields to the `subscribers` table so we can capture:

- **referral_source** — where they found us (instagram, google, hotel-concierge, friend, other)
- **location_interest** — which boutique they care about (opal-grand, opal-sol, jupiter-beach, multiple, undecided)
- **purchase_intent** — why they're on the list (browsing, looking-to-purchase, custom-piece, gift)

Plus a `survey_completed_at` timestamp so we know who has already filled it out.

---

## SQL — run in Supabase SQL Editor

```sql
alter table public.subscribers
  add column if not exists referral_source   text,
  add column if not exists location_interest text,
  add column if not exists purchase_intent   text,
  add column if not exists survey_completed_at timestamptz;

-- Optional: light validation (uncomment to enforce)
-- alter table public.subscribers
--   add constraint subscribers_referral_source_chk
--   check (referral_source is null or referral_source in (
--     'instagram','google','hotel-concierge','friend','event','other'
--   ));
-- alter table public.subscribers
--   add constraint subscribers_location_interest_chk
--   check (location_interest is null or location_interest in (
--     'opal-grand','opal-sol','jupiter-beach','multiple','undecided'
--   ));
-- alter table public.subscribers
--   add constraint subscribers_purchase_intent_chk
--   check (purchase_intent is null or purchase_intent in (
--     'browsing','looking-to-purchase','custom-piece','gift'
--   ));

create index if not exists subscribers_survey_idx
  on public.subscribers (survey_completed_at);
```

After running, the existing rows have `NULL` in all three fields — they'll get filled in either:

1. **At signup time** — when new subscribers click the confirmation link, they're routed to `/preferences?token=...` and asked the three questions.
2. **Via survey blast** — for existing subscribers, the admin can trigger a one-time email that links them to the same `/preferences` page.

---

## Newsletter campaigns table (Path A)

For sending weekly/monthly broadcasts directly from our own stack:

```sql
create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preheader text,
  html_body text not null,
  status text not null default 'draft', -- draft | scheduled | sending | sent | failed
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipients_count int default 0,
  created_at timestamptz default now(),
  created_by text
);

alter table public.newsletter_campaigns enable row level security;
create policy "Service role only" on public.newsletter_campaigns for all using (false);

create table if not exists public.newsletter_sends (
  id bigserial primary key,
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_email text not null,
  sent_at timestamptz default now(),
  resend_id text,
  error text
);

create index if not exists newsletter_sends_campaign_idx
  on public.newsletter_sends (campaign_id);

alter table public.newsletter_sends enable row level security;
create policy "Service role only" on public.newsletter_sends for all using (false);
```

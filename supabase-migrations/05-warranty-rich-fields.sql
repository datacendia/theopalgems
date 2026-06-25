-- Migration 05: enrich warranty_registrations with marketing / CRM intel
-- Run in Supabase SQL Editor AFTER migration 04.
--
-- All new columns are nullable — existing rows continue to work and the
-- public form treats every Tier-1/2/3/4 field as optional.

alter table public.warranty_registrations
  -- Tier 1 — Marketing intelligence
  add column if not exists occasion                    text,
  add column if not exists is_gift                     boolean,
  add column if not exists gift_recipient_name         text,
  add column if not exists gift_recipient_relationship text,
  add column if not exists gift_recipient_birthday     date,
  add column if not exists customer_birthday           date,
  add column if not exists discovery_source            text,
  add column if not exists is_visiting                 boolean,
  add column if not exists staying_at_hotel            boolean,
  add column if not exists hotel_name                  text,
  add column if not exists hotel_checkout_date         date,
  add column if not exists home_city                   text,
  add column if not exists marketing_opt_in_email      boolean default false,
  add column if not exists marketing_opt_in_sms        boolean default false,
  -- Tier 2 — Product preferences
  add column if not exists ring_size                   text,
  add column if not exists chain_length                text,
  add column if not exists metal_preference            text,
  add column if not exists style_preferences           text[],
  add column if not exists engraving_text              text,
  add column if not exists wants_appraisal             boolean default false,
  add column if not exists care_kit_interest           boolean default false,
  -- Tier 3 — Experience capture
  add column if not exists experience_rating           smallint check (experience_rating between 1 and 5),
  add column if not exists photo_url                   text,
  add column if not exists ugc_consent                 boolean default false,
  add column if not exists associate_confirmed         boolean,
  -- Tier 4 — Loyalty & referrals
  add column if not exists referred_by                 text,
  add column if not exists is_returning_customer       boolean,
  add column if not exists interested_in_events        boolean default false;

-- Indexes for the dimensions you'll actually slice the data on
create index if not exists warranty_occasion_idx       on public.warranty_registrations (occasion);
create index if not exists warranty_discovery_idx      on public.warranty_registrations (discovery_source);
create index if not exists warranty_visiting_idx       on public.warranty_registrations (is_visiting);
create index if not exists warranty_marketing_email_idx
  on public.warranty_registrations (created_at desc)
  where marketing_opt_in_email is true;
create index if not exists warranty_returning_idx
  on public.warranty_registrations (is_returning_customer);
create index if not exists warranty_events_idx
  on public.warranty_registrations (interested_in_events)
  where interested_in_events is true;

-- Birthday/anniversary reminder helpers: index on month-day so a scheduled
-- job can ask "whose birthday is today?" without scanning the whole table.
-- We encode month-day as an integer (month*100 + day) because extract() on a
-- date column is IMMUTABLE, whereas to_char() is only STABLE and Postgres
-- rejects it in an index expression (error 42P17).
create index if not exists warranty_customer_bday_md_idx
  on public.warranty_registrations (
    (extract(month from customer_birthday) * 100 + extract(day from customer_birthday))
  )
  where customer_birthday is not null;
create index if not exists warranty_purchase_anniv_md_idx
  on public.warranty_registrations (
    (extract(month from purchase_date) * 100 + extract(day from purchase_date))
  )
  where purchase_date is not null;

comment on column public.warranty_registrations.occasion             is 'engagement | anniversary | birthday | self_purchase | gift | just_because | other';
comment on column public.warranty_registrations.discovery_source     is 'instagram | google | hotel_concierge | walk_in | returning_customer | friend_referral | event | other';
comment on column public.warranty_registrations.metal_preference     is 'yellow_gold | white_gold | rose_gold | platinum | silver | mixed';
comment on column public.warranty_registrations.style_preferences    is 'array subset of: classic, modern, vintage, statement, minimalist, bohemian';
comment on column public.warranty_registrations.experience_rating    is '1-5 stars, captured at point of registration';
comment on column public.warranty_registrations.photo_url            is 'public URL of the customer-uploaded photo in the warranty-photos bucket';

-- ───────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKET (run from Supabase Dashboard → Storage, or via SQL below)
-- ───────────────────────────────────────────────────────────────────────────
-- 1. Create a public bucket named 'warranty-photos' (public read).
-- 2. Add policies so anonymous visitors can INSERT but cannot LIST/UPDATE/DELETE.
--
-- The SQL below creates the bucket and the minimal policy set. Safe to re-run.

insert into storage.buckets (id, name, public)
values ('warranty-photos', 'warranty-photos', true)
on conflict (id) do nothing;

-- Drop any existing policies on this bucket so we can replace them cleanly
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname like 'warranty-photos%'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- Anonymous visitors may upload (insert) only.
create policy "warranty-photos anon insert"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'warranty-photos');

-- Anyone may read (public bucket). Explicit policy makes intent obvious.
create policy "warranty-photos public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'warranty-photos');

-- No anon update/delete — admins use the service key which bypasses RLS.

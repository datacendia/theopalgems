-- Migration 04: warranty registrations
-- After an in-boutique sale the store assistant displays a QR code that
-- routes the customer to /warranty/register. Submissions land here.
--
-- Run this in Supabase SQL Editor.

create table if not exists public.warranty_registrations (
  id uuid primary key default gen_random_uuid(),
  -- Customer identity
  customer_name      text not null,
  customer_email     text not null,
  customer_phone     text not null,
  -- Shipping / mailing address (optional individual fields for clean export)
  address_line1      text,
  address_line2      text,
  city               text,
  state_region       text,
  postal_code        text,
  country            text default 'United States',
  -- Item
  item_name          text not null,
  item_category      text,
  item_sku           text,
  item_serial        text,
  purchase_price     numeric(12,2),
  purchase_date      date,
  -- Sale context
  store_location     text,   -- 'opal-grand' | 'opal-sol' | 'jupiter-beach' | free text
  sales_associate    text,
  receipt_number     text,
  notes              text,
  -- Bookkeeping
  status             text not null default 'pending',  -- pending | confirmed | archived
  source_ip          text,
  user_agent         text,
  created_at         timestamptz not null default now(),
  confirmed_at       timestamptz
);

create index if not exists warranty_registrations_email_idx
  on public.warranty_registrations (lower(customer_email));

create index if not exists warranty_registrations_created_idx
  on public.warranty_registrations (created_at desc);

create index if not exists warranty_registrations_location_idx
  on public.warranty_registrations (store_location);

-- Row-Level Security: lock the table down so the public anon key cannot
-- read or write. The service key (used by Netlify Functions and the
-- /api/admin-data proxy) bypasses RLS, so admin code keeps working.
alter table public.warranty_registrations enable row level security;

-- Drop any permissive policies that may have been added in error
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'warranty_registrations'
  loop
    execute format('drop policy if exists %I on public.warranty_registrations', pol.policyname);
  end loop;
end $$;

-- Deny-all baseline policy. All real access goes through the service key.
create policy "deny all on warranty_registrations"
  on public.warranty_registrations
  for all
  using (false)
  with check (false);

comment on table public.warranty_registrations is
  'In-boutique warranty registrations submitted from /warranty/register after a customer scans the store QR code.';

-- Migration 02: add unsubscribe tracking to subscribers table
-- Run this in Supabase SQL Editor AFTER migration 01 (create subscribers table)

-- Add unique token per subscriber so unsubscribe links are non-guessable
alter table public.subscribers
  add column if not exists unsubscribe_token uuid default gen_random_uuid();

-- Backfill any existing rows that predate this column
update public.subscribers
  set unsubscribe_token = gen_random_uuid()
  where unsubscribe_token is null;

-- Enforce uniqueness
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'subscribers'
      and indexname = 'subscribers_unsubscribe_token_key'
  ) then
    alter table public.subscribers
      add constraint subscribers_unsubscribe_token_key unique (unsubscribe_token);
  end if;
end $$;

-- Track when someone unsubscribed (null = still subscribed)
alter table public.subscribers
  add column if not exists unsubscribed_at timestamptz;

-- Optional index for filtering active subscribers
create index if not exists subscribers_active_idx
  on public.subscribers (created_at desc)
  where unsubscribed_at is null;

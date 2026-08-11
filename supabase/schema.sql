-- HomeLoop events schema
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date not null,
  start_time time,
  end_date date,
  end_time time,
  assigned_to text not null,
  category text not null,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;

create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_events_updated_at();

alter table public.events enable row level security;

-- TEMPORARY DEVELOPMENT POLICIES
-- These allow anonymous (anon key) clients to read and create events
-- because HomeLoop authentication is not implemented yet.
-- REPLACE these policies when authentication is added.
-- Do NOT use this configuration in production.

drop policy if exists "dev_anon_select_events" on public.events;
drop policy if exists "dev_anon_insert_events" on public.events;

create policy "dev_anon_select_events"
on public.events
for select
to anon, authenticated
using (true);

create policy "dev_anon_insert_events"
on public.events
for insert
to anon, authenticated
with check (true);

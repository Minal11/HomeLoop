-- HomeLoop: one reminder per event + Web Push subscriptions.
-- Run AFTER 010_family_timezone.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- event_reminders (exactly one reminder per event for this MVP)
-- ---------------------------------------------------------------------------
create table if not exists public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  offset_minutes integer not null,
  remind_at timestamptz not null,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint event_reminders_event_id_unique unique (event_id)
);

create index if not exists event_reminders_due_idx
  on public.event_reminders (remind_at)
  where sent_at is null;

alter table public.event_reminders enable row level security;

drop policy if exists "event_reminders_select_family" on public.event_reminders;
drop policy if exists "event_reminders_insert_family" on public.event_reminders;
drop policy if exists "event_reminders_update_family" on public.event_reminders;
drop policy if exists "event_reminders_delete_family" on public.event_reminders;

create policy "event_reminders_select_family"
on public.event_reminders
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
);

create policy "event_reminders_insert_family"
on public.event_reminders
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
);

create policy "event_reminders_update_family"
on public.event_reminders
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
);

create policy "event_reminders_delete_family"
on public.event_reminders
for delete
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
);

-- ---------------------------------------------------------------------------
-- push_subscriptions (per device / endpoint)
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;

create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

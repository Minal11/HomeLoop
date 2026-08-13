-- HomeLoop: recurring events (parent series + exceptions).
-- Run AFTER 012_shortcut_tokens.sql.
-- Existing one-time events remain valid with all recurrence_* columns null.

-- ---------------------------------------------------------------------------
-- Recurrence fields on events (nullable = non-recurring)
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists recurrence_frequency text null,
  add column if not exists recurrence_interval integer null,
  add column if not exists recurrence_weekdays smallint[] null,
  add column if not exists recurrence_end_date date null;

alter table public.events
  drop constraint if exists events_recurrence_frequency_check;

alter table public.events
  add constraint events_recurrence_frequency_check
  check (
    recurrence_frequency is null
    or recurrence_frequency in ('daily', 'weekly', 'monthly', 'yearly')
  );

alter table public.events
  drop constraint if exists events_recurrence_interval_check;

alter table public.events
  add constraint events_recurrence_interval_check
  check (
    recurrence_interval is null
    or recurrence_interval >= 1
  );

comment on column public.events.recurrence_frequency is
  'daily|weekly|monthly|yearly; null means non-recurring';
comment on column public.events.recurrence_interval is
  'Repeat every N units of frequency; null when non-recurring';
comment on column public.events.recurrence_weekdays is
  '0=Sun..6=Sat; used for weekly recurrence';
comment on column public.events.recurrence_end_date is
  'Inclusive end date for the series; null means never ends';

-- ---------------------------------------------------------------------------
-- Exceptions / single-occurrence overrides
-- ---------------------------------------------------------------------------
create table if not exists public.event_exceptions (
  id uuid primary key default gen_random_uuid(),
  series_event_id uuid not null references public.events (id) on delete cascade,
  occurrence_date date not null,
  exception_type text not null,
  override_event_id uuid null references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint event_exceptions_type_check
    check (exception_type in ('cancelled', 'modified')),
  constraint event_exceptions_series_date_unique
    unique (series_event_id, occurrence_date)
);

create index if not exists event_exceptions_series_idx
  on public.event_exceptions (series_event_id);

create index if not exists event_exceptions_override_idx
  on public.event_exceptions (override_event_id)
  where override_event_id is not null;

alter table public.event_exceptions enable row level security;

drop policy if exists "event_exceptions_select_family" on public.event_exceptions;
drop policy if exists "event_exceptions_insert_family" on public.event_exceptions;
drop policy if exists "event_exceptions_update_family" on public.event_exceptions;
drop policy if exists "event_exceptions_delete_family" on public.event_exceptions;

create policy "event_exceptions_select_family"
on public.event_exceptions
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = series_event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
);

create policy "event_exceptions_insert_family"
on public.event_exceptions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events e
    where e.id = series_event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
);

create policy "event_exceptions_update_family"
on public.event_exceptions
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = series_event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = series_event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
);

create policy "event_exceptions_delete_family"
on public.event_exceptions
for delete
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = series_event_id
      and e.family_id is not null
      and public.is_family_member(e.family_id)
  )
);

-- ---------------------------------------------------------------------------
-- Reminder tracking for recurring series (one-time behavior unchanged)
-- ---------------------------------------------------------------------------
alter table public.event_reminders
  add column if not exists last_reminded_occurrence_date date null;

comment on column public.event_reminders.last_reminded_occurrence_date is
  'For recurring series: last occurrence date that was successfully notified';

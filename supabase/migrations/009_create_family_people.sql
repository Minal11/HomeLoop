-- HomeLoop Step 11: schedulable family people (not account membership)
-- Run AFTER Step 10 migrations (005–008) are applied.
-- Does NOT modify family_members (account access stays as-is).

create extension if not exists pgcrypto;

create table if not exists public.family_people (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null,
  linked_user_id uuid null references auth.users (id) on delete set null,
  relationship text null
    check (
      relationship is null
      or relationship in ('Adult', 'Child', 'Other')
    ),
  birth_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_people_display_name_not_blank
    check (length(trim(display_name)) > 0)
);

-- One linked account per family (a user is at most one schedulable person in a family)
create unique index if not exists family_people_family_linked_user_uidx
  on public.family_people (family_id, linked_user_id)
  where linked_user_id is not null;

create index if not exists family_people_family_id_idx
  on public.family_people (family_id);

create index if not exists family_people_display_name_idx
  on public.family_people (family_id, lower(display_name));

create or replace function public.set_family_people_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists family_people_set_updated_at on public.family_people;

create trigger family_people_set_updated_at
before update on public.family_people
for each row
execute function public.set_family_people_updated_at();

alter table public.family_people enable row level security;

-- Whole-family events without a fake "Family" person row.
-- Future-proof: new people added later are still covered when true.
alter table public.events
  add column if not exists applies_to_all boolean not null default false;

comment on column public.events.applies_to_all is
  'When true, event involves the whole family. Prefer this over a fake Family person.';

comment on column public.events.assigned_to is
  'Legacy text assignment (Minal/Ankush/Ziva/Family). Kept for backfill; app uses event_people + applies_to_all.';

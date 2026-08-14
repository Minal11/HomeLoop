-- HomeLoop: per-family event categories (name + color).
-- Run AFTER 013_event_recurrence.sql.
-- Existing events keep category text; colors resolve by matching name.

create table if not exists public.family_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_categories_name_not_blank check (length(trim(name)) > 0),
  constraint family_categories_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint family_categories_family_name_unique unique (family_id, name)
);

create index if not exists family_categories_family_id_idx
  on public.family_categories (family_id, sort_order, name);

alter table public.family_categories enable row level security;

drop policy if exists "family_categories_select_member" on public.family_categories;
drop policy if exists "family_categories_insert_member" on public.family_categories;
drop policy if exists "family_categories_update_member" on public.family_categories;
drop policy if exists "family_categories_delete_member" on public.family_categories;

create policy "family_categories_select_member"
on public.family_categories
for select
to authenticated
using (public.is_family_member(family_id));

create policy "family_categories_insert_member"
on public.family_categories
for insert
to authenticated
with check (public.is_family_member(family_id));

create policy "family_categories_update_member"
on public.family_categories
for update
to authenticated
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "family_categories_delete_member"
on public.family_categories
for delete
to authenticated
using (public.is_family_member(family_id));

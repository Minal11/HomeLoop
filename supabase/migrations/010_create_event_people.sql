-- HomeLoop Step 11: multi-person event assignments
-- Run AFTER 009_create_family_people.sql.

create table if not exists public.event_people (
  event_id uuid not null references public.events (id) on delete cascade,
  person_id uuid not null references public.family_people (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, person_id)
);

create index if not exists event_people_person_id_idx
  on public.event_people (person_id);

alter table public.event_people enable row level security;

-- ---------------------------------------------------------------------------
-- MANUAL BACKFILL (placeholders only — do not commit real UUIDs)
-- ---------------------------------------------------------------------------
-- 1) Find family id:
--    select id, name from public.families;
--
-- 2) Create people (link adults when you know their auth user ids):
--
--    insert into public.family_people (family_id, display_name, linked_user_id, relationship)
--    values
--      ('YOUR_FAMILY_ID', 'Minal', 'MINAL_USER_UUID', 'Adult'),
--      ('YOUR_FAMILY_ID', 'Ankush', 'ANKUSH_USER_UUID', 'Adult'),
--      ('YOUR_FAMILY_ID', 'Ziva', null, 'Child');
--
--    -- If Ankush has not joined yet, insert Ankush with linked_user_id null,
--    -- then later:
--    -- update public.family_people
--    -- set linked_user_id = 'ANKUSH_USER_UUID'
--    -- where family_id = 'YOUR_FAMILY_ID' and display_name = 'Ankush';
--
-- 3) Map legacy events.assigned_to → event_people / applies_to_all:
--
--    -- Whole family
--    update public.events e
--    set applies_to_all = true
--    where e.family_id = 'YOUR_FAMILY_ID'
--      and e.assigned_to = 'Family';
--
--    -- Named people
--    insert into public.event_people (event_id, person_id)
--    select e.id, p.id
--    from public.events e
--    join public.family_people p
--      on p.family_id = e.family_id
--     and p.display_name = e.assigned_to
--    where e.family_id = 'YOUR_FAMILY_ID'
--      and e.assigned_to in ('Minal', 'Ankush', 'Ziva')
--    on conflict do nothing;
--
-- 4) Verify:
--
--    select e.title, e.assigned_to, e.applies_to_all,
--           coalesce(string_agg(p.display_name, ' + ' order by p.display_name), '') as people
--    from public.events e
--    left join public.event_people ep on ep.event_id = e.id
--    left join public.family_people p on p.id = ep.person_id
--    where e.family_id = 'YOUR_FAMILY_ID'
--    group by e.id
--    order by e.start_date;
--
-- Removing a family_people row deletes their event_people assignments only
-- (ON DELETE CASCADE on person_id). The events themselves are NOT deleted.

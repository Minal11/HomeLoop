-- HomeLoop Step 10: attach events to families
-- Run AFTER 005_create_families.sql.
-- family_id stays nullable until you backfill existing rows (see README).

alter table public.events
  add column if not exists family_id uuid references public.families (id);

create index if not exists events_family_id_idx
  on public.events (family_id);

-- MANUAL BACKFILL (do not hardcode UUIDs in this file):
--
-- 1) Find your user UUID in Supabase → Authentication → Users
-- 2) Create the family + membership (example names — change as needed):
--
--    insert into public.families (name, created_by, invite_code)
--    values (
--      'Kondawar-Agrekar Family',
--      'YOUR_USER_UUID',
--      public.generate_family_invite_code()
--    )
--    returning id, invite_code;
--
--    insert into public.family_members (family_id, user_id, role)
--    values ('YOUR_FAMILY_ID', 'YOUR_USER_UUID', 'owner');
--
--    -- optional profile
--    insert into public.profiles (id, display_name)
--    values ('YOUR_USER_UUID', 'Minal')
--    on conflict (id) do update set display_name = excluded.display_name;
--
-- 3) Assign existing events owned by that user:
--
--    update public.events
--    set family_id = 'YOUR_FAMILY_ID'
--    where created_by = 'YOUR_USER_UUID'
--      and family_id is null;
--
-- 4) Verify:
--
--    select id, title, created_by, family_id
--    from public.events
--    order by start_date;
--
-- 5) After every event has a family_id, run:
--    supabase/migrations/008_events_family_id_not_null.sql

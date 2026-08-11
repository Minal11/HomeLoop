-- HomeLoop Step 6: authentication + event ownership
-- TEMPORARY NOTE: Run this AFTER enabling Email auth in Supabase.
-- Existing events keep working only after you backfill created_by (see README).

-- 1) Add ownership column (nullable first so existing rows stay valid)
alter table public.events
  add column if not exists created_by uuid references auth.users (id);

create index if not exists events_created_by_idx
  on public.events (created_by);

-- 2) Remove temporary anonymous development policies from Steps 4–5
drop policy if exists "dev_anon_select_events" on public.events;
drop policy if exists "dev_anon_insert_events" on public.events;
drop policy if exists "dev_anon_update_events" on public.events;
drop policy if exists "dev_anon_delete_events" on public.events;

-- 3) Keep RLS enabled
alter table public.events enable row level security;

-- 4) Ownership-based authenticated policies
drop policy if exists "events_select_own" on public.events;
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_own" on public.events;
drop policy if exists "events_delete_own" on public.events;

create policy "events_select_own"
on public.events
for select
to authenticated
using (created_by = auth.uid());

create policy "events_insert_own"
on public.events
for insert
to authenticated
with check (created_by = auth.uid());

create policy "events_update_own"
on public.events
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "events_delete_own"
on public.events
for delete
to authenticated
using (created_by = auth.uid());

-- Anonymous users have no event policies (no access).
--
-- NEXT MANUAL STEPS (do not hardcode UUIDs here):
-- A. Create your first HomeLoop account via /login
-- B. Find that user's UUID in Supabase Auth → Users
-- C. Run:
--      update public.events
--      set created_by = 'YOUR_USER_UUID'
--      where created_by is null;
-- D. After every event has an owner, run:
--      supabase/migrations/004_created_by_not_null.sql

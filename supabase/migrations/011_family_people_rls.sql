-- HomeLoop Step 11: RLS for family_people + event_people
-- Run AFTER 009 and 010. Relies on is_family_member() from Step 10.

-- ---------------------------------------------------------------------------
-- family_people
-- Any authenticated family member can manage schedulable people (shared household).
-- Owner-only delete is NOT used: both adults manage kids' schedules.
-- linked_user_id cannot be set arbitrarily from the client without also
-- belonging to the family; prefer migration/SQL for account linking.
-- ---------------------------------------------------------------------------
drop policy if exists "family_people_select_member" on public.family_people;
drop policy if exists "family_people_insert_member" on public.family_people;
drop policy if exists "family_people_update_member" on public.family_people;
drop policy if exists "family_people_delete_member" on public.family_people;

create policy "family_people_select_member"
on public.family_people
for select
to authenticated
using (public.is_family_member(family_id));

create policy "family_people_insert_member"
on public.family_people
for insert
to authenticated
with check (public.is_family_member(family_id));

create policy "family_people_update_member"
on public.family_people
for update
to authenticated
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "family_people_delete_member"
on public.family_people
for delete
to authenticated
using (public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- event_people
-- Assignments only when the user is in the event's family AND the person
-- belongs to that same family (blocks cross-family person_id spoofing).
-- ---------------------------------------------------------------------------
drop policy if exists "event_people_select_family" on public.event_people;
drop policy if exists "event_people_insert_family" on public.event_people;
drop policy if exists "event_people_delete_family" on public.event_people;

create policy "event_people_select_family"
on public.event_people
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

create policy "event_people_insert_family"
on public.event_people
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events e
    join public.family_people p on p.id = person_id
    where e.id = event_id
      and e.family_id is not null
      and p.family_id = e.family_id
      and public.is_family_member(e.family_id)
  )
);

create policy "event_people_delete_family"
on public.event_people
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

-- No UPDATE policy: assignments are replaced via delete + insert.
-- Anonymous users have no policies (no access).

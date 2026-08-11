-- HomeLoop Step 10: family-based RLS
-- Run AFTER 005 and 006. Replaces owner-only event policies.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_family" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_select_family"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.family_members mine
    join public.family_members theirs
      on mine.family_id = theirs.family_id
    where mine.user_id = auth.uid()
      and theirs.user_id = profiles.id
  )
);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Families
-- ---------------------------------------------------------------------------
drop policy if exists "families_select_member" on public.families;
drop policy if exists "families_insert_creator" on public.families;
drop policy if exists "families_update_owner" on public.families;

create policy "families_select_member"
on public.families
for select
to authenticated
using (public.is_family_member(id));

create policy "families_insert_creator"
on public.families
for insert
to authenticated
with check (created_by = auth.uid());

create policy "families_update_owner"
on public.families
for update
to authenticated
using (public.is_family_owner(id))
with check (public.is_family_owner(id));

-- ---------------------------------------------------------------------------
-- Family members
-- ---------------------------------------------------------------------------
drop policy if exists "family_members_select_same_family" on public.family_members;
drop policy if exists "family_members_insert_creator_owner" on public.family_members;

create policy "family_members_select_same_family"
on public.family_members
for select
to authenticated
using (public.is_family_member(family_id));

-- Allow the family creator to add themselves as owner right after create.
-- Joining via invite code uses join_family_by_invite_code() (security definer).
create policy "family_members_insert_creator_owner"
on public.family_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1
    from public.families f
    where f.id = family_id
      and f.created_by = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Events — replace ownership-only policies with family membership
-- ---------------------------------------------------------------------------
drop policy if exists "events_select_own" on public.events;
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_own" on public.events;
drop policy if exists "events_delete_own" on public.events;

drop policy if exists "events_select_family" on public.events;
drop policy if exists "events_insert_family" on public.events;
drop policy if exists "events_update_family" on public.events;
drop policy if exists "events_delete_family" on public.events;

alter table public.events enable row level security;

create policy "events_select_family"
on public.events
for select
to authenticated
using (
  family_id is not null
  and public.is_family_member(family_id)
);

create policy "events_insert_family"
on public.events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and family_id is not null
  and public.is_family_member(family_id)
);

create policy "events_update_family"
on public.events
for update
to authenticated
using (
  family_id is not null
  and public.is_family_member(family_id)
)
with check (
  family_id is not null
  and public.is_family_member(family_id)
);

create policy "events_delete_family"
on public.events
for delete
to authenticated
using (
  family_id is not null
  and public.is_family_member(family_id)
);

-- Anonymous users still have no policies (no access).

-- HomeLoop: allow family creators to read the row they just inserted.
-- Fixes createFamily() failing on insert().select() before membership exists.
-- Run AFTER 015_profile_onboarding.sql (or after 007_family_rls.sql).

drop policy if exists "families_select_member" on public.families;

create policy "families_select_member"
on public.families
for select
to authenticated
using (
  public.is_family_member(id)
  or created_by = auth.uid()
);

-- HomeLoop Step 5
-- TEMPORARY DEVELOPMENT ONLY
-- Extends anonymous event access to UPDATE and DELETE.
-- Keep RLS enabled. Replace these policies when authentication is added.
-- Do NOT use this configuration for public production deployment.

alter table public.events enable row level security;

drop policy if exists "dev_anon_update_events" on public.events;
drop policy if exists "dev_anon_delete_events" on public.events;

create policy "dev_anon_update_events"
on public.events
for update
to anon, authenticated
using (true)
with check (true);

create policy "dev_anon_delete_events"
on public.events
for delete
to anon, authenticated
using (true);

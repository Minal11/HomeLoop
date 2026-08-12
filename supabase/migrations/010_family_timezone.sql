-- HomeLoop: family IANA timezone for reminder scheduling.
-- Run AFTER 005–009.

alter table public.families
  add column if not exists timezone text not null default 'America/Chicago';

comment on column public.families.timezone is
  'IANA timezone used when scheduling event reminders (e.g. America/Chicago).';

-- Optional backfill for an existing family (replace the name if needed):
-- update public.families
-- set timezone = 'America/Chicago'
-- where name = 'YOUR_FAMILY_NAME';

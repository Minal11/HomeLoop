-- HomeLoop Step 6 follow-up
-- Run ONLY after every events.created_by value is backfilled.

alter table public.events
  alter column created_by set not null;

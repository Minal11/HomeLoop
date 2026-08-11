-- HomeLoop Step 10 follow-up
-- Run ONLY after every events.family_id value is backfilled.

alter table public.events
  alter column family_id set not null;

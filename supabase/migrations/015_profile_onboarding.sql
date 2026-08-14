-- HomeLoop: per-user product tour completion flag.
-- Run AFTER 014_family_categories.sql.
-- Existing users are marked complete so they are not forced through the tour.

alter table public.profiles
  add column if not exists has_completed_onboarding boolean;

-- Backfill everyone who already has a profile.
update public.profiles
set has_completed_onboarding = true
where has_completed_onboarding is null;

alter table public.profiles
  alter column has_completed_onboarding set default false;

alter table public.profiles
  alter column has_completed_onboarding set not null;

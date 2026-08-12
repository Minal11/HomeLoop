-- HomeLoop: structured event location fields for Places autocomplete / maps.
-- Safe additive migration: keeps existing `events.location` text intact.
-- Run in Supabase SQL Editor after Step 10 migrations (005–008).

alter table public.events
  add column if not exists location_name text;

alter table public.events
  add column if not exists location_address text;

alter table public.events
  add column if not exists location_lat double precision;

alter table public.events
  add column if not exists location_lng double precision;

alter table public.events
  add column if not exists location_place_id text;

comment on column public.events.location is
  'Legacy / display location text. Kept for older events and manual entries.';

comment on column public.events.location_name is
  'Place display name from Places autocomplete (nullable for manual text).';

comment on column public.events.location_address is
  'Formatted address from Places (nullable for manual text).';

comment on column public.events.location_lat is
  'Latitude from Places (nullable for manual text).';

comment on column public.events.location_lng is
  'Longitude from Places (nullable for manual text).';

comment on column public.events.location_place_id is
  'Google Place ID when selected from autocomplete (nullable).';

-- HomeLoop sample events (August 2026)
-- Run after schema.sql in the Supabase SQL Editor.

insert into public.events (
  title,
  start_date,
  start_time,
  end_date,
  end_time,
  assigned_to,
  category,
  location,
  notes
)
values
  (
    'Ziva Vaccination',
    '2026-08-14',
    '11:00',
    null,
    null,
    'Ziva',
    'Appointment',
    'Sunrise Pediatric Clinic',
    'Bring vaccination booklet.'
  ),
  (
    'Hospital Visit',
    '2026-08-15',
    null,
    null,
    null,
    'Family',
    'Social',
    'City General Hospital',
    null
  ),
  (
    'Friends Meetup',
    '2026-08-16',
    '17:30',
    null,
    null,
    'Minal',
    'Social',
    'Riverside Cafe',
    null
  ),
  (
    'Workshop',
    '2026-08-22',
    null,
    '2026-08-23',
    null,
    'Minal',
    'Workshop',
    null,
    null
  ),
  (
    'Pooja',
    '2026-08-28',
    '09:00',
    null,
    null,
    'Family',
    'Religious / Pooja',
    null,
    null
  ),
  (
    'Birthday Party',
    '2026-08-29',
    '16:00',
    null,
    null,
    'Family',
    'Birthday',
    null,
    null
  );

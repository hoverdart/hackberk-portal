-- Sample event data for local development and the hosted demo deployment.
-- The row keeps is_synthetic = true so the portal can tell sample data from a
-- real cycle; the name is the event's name, not a disclaimer.
insert into public.events (
  id, slug, name, tagline, venue, starts_at, ends_at,
  applications_open_at, applications_close_at,
  application_forms, application_rubric, project_rubric, is_active, is_synthetic
) values (
  '00000000-0000-4000-8000-000000000001',
  'herkeley-build-2027',
  'Herkeley Build 2027',
  'Ideas, people, possibilities.',
  'Herkeley · Pauley Ballroom',
  '2027-03-06 17:00:00-08',
  '2027-03-08 17:00:00-08',
  '2026-10-01 09:00:00-07',
  '2027-01-19 23:59:00-08',
  '{"version":1,"roles":["hacker","judge","mentor","volunteer"]}',
  '{"version":1,"criteria":[{"key":"motivation","label":"Motivation","weight":0.35},{"key":"growth","label":"Growth potential","weight":0.35},{"key":"community","label":"Community contribution","weight":0.30}]}',
  '{"version":1,"criteria":[{"key":"innovation","label":"Innovation","weight":0.30},{"key":"execution","label":"Execution","weight":0.30},{"key":"impact","label":"Impact","weight":0.25},{"key":"story","label":"Story","weight":0.15}]}',
  true,
  true
) on conflict (id) do update set
  name = excluded.name,
  application_forms = excluded.application_forms,
  application_rubric = excluded.application_rubric,
  project_rubric = excluded.project_rubric,
  updated_at = now();

insert into public.event_milestones (id, event_id, audience, title, description, due_at, sort_order) values
  ('00000000-0000-4000-8001-000000000001', '00000000-0000-4000-8000-000000000001', 'hacker', 'Applications close', 'Submit every required section before the docket closes.', '2027-01-19 23:59:00-08', 10),
  ('00000000-0000-4000-8001-000000000002', '00000000-0000-4000-8000-000000000001', 'hacker', 'Team lock', 'Confirm a team of one to four accepted hackers.', '2027-02-19 23:59:00-08', 20),
  ('00000000-0000-4000-8001-000000000003', '00000000-0000-4000-8000-000000000001', 'judge', 'Judging briefing', 'Review assigned tracks and scoring calibration.', '2027-03-07 10:00:00-08', 30),
  ('00000000-0000-4000-8001-000000000004', '00000000-0000-4000-8000-000000000001', 'mentor', 'Mentor desk opens', 'Set expertise tags before requests arrive.', '2027-03-06 18:00:00-08', 40),
  ('00000000-0000-4000-8001-000000000005', '00000000-0000-4000-8000-000000000001', 'volunteer', 'Shift confirmations due', 'Confirm or release your assigned shifts.', '2027-02-27 17:00:00-08', 50)
on conflict (id) do nothing;

insert into public.volunteer_shifts (id, event_id, title, location, starts_at, ends_at, capacity, checklist) values
  ('00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8000-000000000001', 'Check-in desk', 'Pauley Ballroom · West lobby', '2027-03-06 15:00:00-08', '2027-03-06 19:00:00-08', 12, '["Collect radio","Open badge kit","Review accessibility route"]'),
  ('00000000-0000-4000-8002-000000000002', '00000000-0000-4000-8000-000000000001', 'Midnight snack run', 'Operations room', '2027-03-07 22:00:00-08', '2027-03-08 01:00:00-08', 8, '["Confirm dietary labels","Count stations","Log leftovers"]')
on conflict (id) do nothing;

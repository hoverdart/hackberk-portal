-- Keep the hosted synthetic event aligned with the published March 6, 2027
-- application deadline. The seed mirrors this value for new local databases.
update public.events
set applications_close_at = '2027-03-06 23:59:00-08'::timestamptz,
    updated_at = now()
where id = '00000000-0000-4000-8000-000000000001'::uuid
  and slug = 'herkeley-build-2027';

update public.event_milestones
set due_at = '2027-03-06 23:59:00-08'::timestamptz
where id = '00000000-0000-4000-8001-000000000001'::uuid
  and event_id = '00000000-0000-4000-8000-000000000001'::uuid;

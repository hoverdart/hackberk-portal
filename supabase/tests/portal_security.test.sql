begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(9);

-- Stable synthetic identities keep every policy assertion readable and leave no
-- residue because the file runs inside a transaction.
insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'applicant@example.test', '{"full_name":"Applicant One"}'),
  ('10000000-0000-4000-8000-000000000002', 'organizer@example.test', '{"full_name":"Organizer One"}'),
  ('10000000-0000-4000-8000-000000000003', 'reviewer@example.test', '{"full_name":"Reviewer One"}'),
  ('10000000-0000-4000-8000-000000000004', 'judge@example.test', '{"full_name":"Judge One"}'),
  ('10000000-0000-4000-8000-000000000005', 'outsider@example.test', '{"full_name":"Outsider One"}'),
  ('10000000-0000-4000-8000-000000000006', 'teammate-a@example.test', '{"full_name":"Teammate A"}'),
  ('10000000-0000-4000-8000-000000000007', 'teammate-b@example.test', '{"full_name":"Teammate B"}'),
  ('10000000-0000-4000-8000-000000000008', 'teammate-c@example.test', '{"full_name":"Teammate C"}'),
  ('10000000-0000-4000-8000-000000000009', 'teammate-d@example.test', '{"full_name":"Teammate D"}');

insert into public.staff_members (event_id, user_id, role, created_by) values
  ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'organizer', '10000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'reviewer', '10000000-0000-4000-8000-000000000002');

insert into public.applications (id, event_id, applicant_id, role, status) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'hacker', 'submitted'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'judge', 'accepted'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'hacker', 'draft'),
  ('20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', 'hacker', 'accepted'),
  ('20000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007', 'hacker', 'accepted'),
  ('20000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000008', 'hacker', 'accepted'),
  ('20000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000009', 'hacker', 'accepted');

insert into public.application_answers (application_id, section_key, answers, is_identity_sensitive) values
  ('20000000-0000-4000-8000-000000000001', 'identity', '{"school":"Cal"}', true),
  ('20000000-0000-4000-8000-000000000001', 'motivation', '{"why":"Build together"}', false);
insert into public.review_assignments (id, application_id, reviewer_id, assigned_by) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
set local role authenticated;
select results_eq(
  $$select count(*)::bigint from public.applications where id = '20000000-0000-4000-8000-000000000001'$$,
  $$values (0::bigint)$$,
  'cross-user application reads are denied by RLS'
);
select throws_ok(
  $$update public.applications set status = 'accepted' where id = '20000000-0000-4000-8000-000000000003'$$,
  'Applicant status transition is not allowed',
  'an applicant cannot promote their own draft'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select results_eq(
  $$select count(*)::bigint from public.applications where id = '20000000-0000-4000-8000-000000000001'$$,
  $$values (1::bigint)$$,
  'organizers can read applications in their event'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select results_eq(
  $$select section_key from public.application_answers where application_id = '20000000-0000-4000-8000-000000000001' order by section_key$$,
  $$values ('motivation'::text)$$,
  'assigned application reviewers receive only blind answers'
);

reset role;
insert into public.teams (id, event_id, name, created_by) values
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Constraint Crew', '10000000-0000-4000-8000-000000000006');
insert into public.team_members (team_id, user_id) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006'),
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007'),
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000009');
select throws_ok(
  $$insert into public.team_members (team_id, user_id) values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005')$$,
  'Teams are capped at four people',
  'the fifth team member is rejected transactionally'
);

insert into public.projects (id, event_id, team_id, name, summary, github_url, submitted_at) values
  ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Safe Lens', 'A sufficiently long synthetic project summary.', 'https://github.com/hackberkeley/portal', now());
insert into public.project_review_assignments (project_id, judge_id, assigned_by) values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select results_eq(
  $$select count(*)::bigint from public.projects where id = '50000000-0000-4000-8000-000000000001'$$,
  $$values (1::bigint)$$,
  'an assigned judge can read a submitted project'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select results_eq(
  $$select count(*)::bigint from public.projects where id = '50000000-0000-4000-8000-000000000001'$$,
  $$values (0::bigint)$$,
  'an unassigned account cannot read a submitted project'
);
select throws_ok(
  $$select public.assign_application_reviewer('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003')$$,
  'Organizer access required',
  'a non-organizer cannot assign application reviewers'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$select public.assign_application_reviewer('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002')$$,
  'an organizer can assign an eligible event staff member'
);
select results_eq(
  $$select status from public.applications where id = '20000000-0000-4000-8000-000000000001'$$,
  $$values ('under_review'::public.application_status)$$,
  'the first assignment advances a submitted application to review'
);

reset role;
select * from finish();
rollback;

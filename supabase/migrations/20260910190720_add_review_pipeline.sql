-- Organizer queue is security-invoker so the underlying table policies still apply.
create view public.organizer_application_queue
with (security_invoker = true)
as
select
  a.id as application_id,
  a.event_id,
  a.applicant_id,
  p.full_name as applicant_name,
  a.role,
  a.status,
  a.created_at,
  a.submitted_at,
  count(ra.id)::integer as assigned_reviewers,
  count(ar.id) filter (where ar.status = 'submitted')::integer as submitted_reviews,
  round(avg(
    case when ar.status = 'submitted' then (
      select avg(value::numeric) from jsonb_each_text(ar.scores)
    ) end
  ), 2) as aggregate_score
from public.applications a
join public.profiles p on p.id = a.applicant_id
left join public.review_assignments ra on ra.application_id = a.id and ra.status <> 'conflict'
left join public.application_reviews ar on ar.assignment_id = ra.id
group by a.id, p.full_name;

revoke all on public.organizer_application_queue from anon, authenticated;
grant select on public.organizer_application_queue to authenticated;

-- Co-staff names are needed for assignment controls, but only within a shared event.
create policy profiles_event_staff_read on public.profiles
for select to authenticated
using (
  exists (
    select 1 from public.staff_members target
    join public.staff_members viewer on viewer.event_id = target.event_id
    where target.user_id = profiles.id
      and viewer.user_id = (select auth.uid())
  )
);

create policy review_assignments_reviewer_conflict_update on public.review_assignments
for update to authenticated
using (reviewer_id = (select auth.uid()) and status = 'draft')
with check (reviewer_id = (select auth.uid()) and status in ('draft', 'conflict'));

create or replace function private.limit_review_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  applicant uuid;
  application_event uuid;
begin
  select a.applicant_id, a.event_id into applicant, application_event
  from public.applications a where a.id = new.application_id for update;
  if (select count(*) from public.review_assignments where application_id = new.application_id and status <> 'conflict') >= 2 then
    raise exception 'Each application may have at most two active reviewers';
  end if;
  if applicant = new.reviewer_id then raise exception 'Applicants cannot review themselves'; end if;
  if not exists (
    select 1 from public.staff_members sm
    where sm.event_id = application_event and sm.user_id = new.reviewer_id
  ) then
    raise exception 'Reviewers must be staff for the application event';
  end if;
  return new;
end;
$$;

create or replace function private.guard_review_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_application uuid;
  expected_reviewer uuid;
  score_value text;
begin
  select ra.application_id, ra.reviewer_id
  into expected_application, expected_reviewer
  from public.review_assignments ra
  where ra.id = new.assignment_id;

  if expected_application is distinct from new.application_id or expected_reviewer is distinct from new.reviewer_id then
    raise exception 'Review must match its assignment';
  end if;
  if tg_op = 'UPDATE' and old.status = 'submitted' and new is distinct from old then
    raise exception 'Submitted reviews are immutable';
  end if;
  for score_value in select value from jsonb_each_text(new.scores) loop
    if score_value !~ '^[1-5]$' then raise exception 'Rubric scores must be integers from 1 to 5'; end if;
  end loop;
  if new.status = 'submitted' then
    if new.recommendation is null or jsonb_object_length(new.scores) = 0 then
      raise exception 'Submitted reviews need scores and a recommendation';
    end if;
    new.submitted_at := case when tg_op = 'UPDATE' then coalesce(old.submitted_at, now()) else now() end;
  end if;
  return new;
end;
$$;

create trigger application_reviews_guard
before insert or update on public.application_reviews
for each row execute function private.guard_review_write();

create or replace function private.audit_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (event_id, actor_id, entity_type, entity_id, action, before_state, after_state)
    values (
      new.event_id,
      (select auth.uid()),
      'application',
      new.id,
      'status_changed',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger applications_audit_status
after update on public.applications
for each row execute function private.audit_application_status();

revoke all on function private.guard_review_write() from public, anon, authenticated;
revoke all on function private.audit_application_status() from public, anon, authenticated;
revoke all on function private.limit_review_assignments() from public, anon, authenticated;

create or replace function public.assign_application_reviewer(target_application uuid, target_reviewer uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_event uuid;
  current_status public.application_status;
  assignment_id uuid;
begin
  select a.event_id, a.status into application_event, current_status
  from public.applications a where a.id = target_application for update;
  if application_event is null or not private.is_event_staff(application_event, array['organizer'::public.staff_role]) then
    raise exception 'Organizer access required';
  end if;
  insert into public.review_assignments (application_id, reviewer_id, assigned_by)
  values (target_application, target_reviewer, (select auth.uid()))
  returning id into assignment_id;
  if current_status = 'submitted' then
    update public.applications set status = 'under_review' where id = target_application;
  end if;
  return assignment_id;
end;
$$;

create or replace function public.decide_application(target_application uuid, target_decision public.application_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare application_event uuid;
begin
  if target_decision not in ('accepted', 'waitlisted', 'rejected') then raise exception 'Invalid final decision'; end if;
  select a.event_id into application_event from public.applications a where a.id = target_application and a.status = 'under_review' for update;
  if application_event is null or not private.is_event_staff(application_event, array['organizer'::public.staff_role]) then
    raise exception 'Organizer access required or application is not under review';
  end if;
  if (select count(*) from public.application_reviews ar where ar.application_id = target_application and ar.status = 'submitted') < 2 then
    raise exception 'Two submitted reviews are required';
  end if;
  update public.applications set status = target_decision where id = target_application;
end;
$$;

revoke all on function public.assign_application_reviewer(uuid, uuid) from public, anon;
revoke all on function public.decide_application(uuid, public.application_status) from public, anon;
grant execute on function public.assign_application_reviewer(uuid, uuid) to authenticated;
grant execute on function public.decide_application(uuid, public.application_status) to authenticated;

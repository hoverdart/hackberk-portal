-- An application has one accountable organizer review. Keep historical reviews,
-- but release any legacy reviewer seat so an organizer can claim the application.
update public.review_assignments ra
set status = 'conflict', conflict_reason = 'Superseded by single-organizer blind grading'
where ra.status <> 'conflict'
  and not exists (
    select 1
    from public.applications a
    join public.staff_members sm on sm.event_id = a.event_id
    where a.id = ra.application_id
      and sm.user_id = ra.reviewer_id
      and sm.role = 'organizer'
  );

with ranked_active_assignments as (
  select
    ra.id,
    row_number() over (
      partition by ra.application_id
      order by
        case when exists (
          select 1
          from public.application_reviews ar
          where ar.assignment_id = ra.id and ar.status = 'submitted'
        ) then 0 else 1 end,
        ra.assigned_at,
        ra.id
    ) as position
  from public.review_assignments ra
  where ra.status <> 'conflict'
)
update public.review_assignments ra
set status = 'conflict', conflict_reason = 'Superseded by single-organizer blind grading'
from ranked_active_assignments ranked
where ra.id = ranked.id and ranked.position > 1;

create unique index review_assignments_one_active_per_application_idx
on public.review_assignments (application_id)
where status <> 'conflict';

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

  if (select count(*) from public.review_assignments where application_id = new.application_id and status <> 'conflict') >= 1 then
    raise exception 'Each application may have one active organizer review';
  end if;
  if applicant = new.reviewer_id then raise exception 'Applicants cannot review themselves'; end if;
  if (select auth.uid()) is not null and new.reviewer_id <> (select auth.uid()) then
    raise exception 'Organizers may only claim their own blind reviews';
  end if;
  if not exists (
    select 1 from public.staff_members sm
    where sm.event_id = application_event
      and sm.user_id = new.reviewer_id
      and sm.role = 'organizer'
  ) then
    raise exception 'Reviews must be claimed by an organizer for the application event';
  end if;
  return new;
end;
$$;

create or replace function private.is_application_reviewer(target_application uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.review_assignments ra
    join public.applications a on a.id = ra.application_id
    join public.staff_members sm on sm.event_id = a.event_id and sm.user_id = ra.reviewer_id
    where ra.application_id = target_application
      and ra.reviewer_id = (select auth.uid())
      and ra.status <> 'conflict'
      and sm.role = 'organizer'
  );
$$;

drop policy if exists review_assignments_reviewer_read on public.review_assignments;
drop policy if exists review_assignments_reviewer_conflict_update on public.review_assignments;
drop policy if exists application_reviews_reviewer_all on public.application_reviews;

create policy application_reviews_organizer_owner_all on public.application_reviews
for all to authenticated
using (
  reviewer_id = (select auth.uid())
  and exists (
    select 1
    from public.review_assignments ra
    join public.applications a on a.id = ra.application_id
    where ra.id = application_reviews.assignment_id
      and ra.application_id = application_reviews.application_id
      and ra.reviewer_id = (select auth.uid())
      and ra.status <> 'conflict'
      and private.is_event_staff(a.event_id, array['organizer'::public.staff_role])
  )
)
with check (
  reviewer_id = (select auth.uid())
  and exists (
    select 1
    from public.review_assignments ra
    join public.applications a on a.id = ra.application_id
    where ra.id = application_reviews.assignment_id
      and ra.application_id = application_reviews.application_id
      and ra.reviewer_id = (select auth.uid())
      and ra.status <> 'conflict'
      and private.is_event_staff(a.event_id, array['organizer'::public.staff_role])
  )
);

create or replace function public.claim_application_review(target_application uuid)
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
  values (target_application, (select auth.uid()), (select auth.uid()))
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
declare
  application_event uuid;
begin
  select event_id into application_event from public.applications where id = target_application for update;
  if application_event is null or not private.is_event_staff(application_event, array['organizer'::public.staff_role]) then
    raise exception 'Organizer access required';
  end if;
  if target_decision not in ('accepted', 'waitlisted', 'rejected') then
    raise exception 'Invalid final decision';
  end if;
  if not exists (
    select 1
    from public.application_reviews ar
    join public.review_assignments ra on ra.id = ar.assignment_id
    where ar.application_id = target_application
      and ar.status = 'submitted'
      and ra.status <> 'conflict'
  ) then
    raise exception 'One submitted organizer review is required';
  end if;
  update public.applications
  set status = target_decision, decided_at = now()
  where id = target_application;
end;
$$;

-- The queue remains security-invoker and only counts the active organizer seat.
create or replace view public.organizer_application_queue
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

revoke all on function private.limit_review_assignments() from public, anon, authenticated;
revoke all on function private.is_application_reviewer(uuid) from public, anon;
grant execute on function private.is_application_reviewer(uuid) to authenticated;
revoke all on function public.assign_application_reviewer(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_application_review(uuid) from public, anon;
revoke all on function public.decide_application(uuid, public.application_status) from public, anon;
grant execute on function public.claim_application_review(uuid) to authenticated;
grant execute on function public.decide_application(uuid, public.application_status) to authenticated;

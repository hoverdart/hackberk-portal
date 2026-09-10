create or replace function public.team_match_candidates(target_event uuid)
returns table (user_id uuid, score integer, reasons jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select mp.* from public.matching_profiles mp
    where mp.event_id = target_event and mp.user_id = (select auth.uid()) and mp.opted_in
      and exists (select 1 from public.applications a where a.event_id = target_event and a.applicant_id = (select auth.uid()) and a.role = 'hacker' and a.status = 'accepted')
  ), candidates as (
    select other.*,
      cardinality(array(select unnest(other.interests) intersect select unnest(me.interests))) as shared_interests,
      cardinality(array(select unnest(other.availability) intersect select unnest(me.availability))) as shared_availability,
      cardinality(array(select unnest(other.skills) except select unnest(me.skills))) as complementary_skills,
      greatest(0, 5 - abs(other.experience_level - me.experience_level)) as experience_fit
    from public.matching_profiles other cross join me
    where other.event_id = target_event and other.user_id <> (select auth.uid()) and other.opted_in
      and exists (
        select 1 from public.applications accepted
        where accepted.event_id = target_event and accepted.applicant_id = other.user_id
          and accepted.role = 'hacker' and accepted.status = 'accepted'
      )
      and not exists (
        select 1 from public.team_members occupied
        join public.teams occupied_team on occupied_team.id = occupied.team_id
        where occupied.user_id = other.user_id and occupied_team.event_id = target_event
      )
      and not exists (
        select 1 from public.team_members mine
        join public.teams my_team on my_team.id = mine.team_id and my_team.event_id = target_event
        join public.team_members theirs on theirs.team_id = mine.team_id and theirs.user_id = other.user_id
        where mine.user_id = (select auth.uid())
      )
  )
  select c.user_id,
    (c.shared_interests * 4 + c.shared_availability * 3 + least(c.complementary_skills, 4) * 2 + c.experience_fit)::integer,
    jsonb_strip_nulls(jsonb_build_object(
      'shared_interests', nullif(c.shared_interests, 0),
      'shared_availability', nullif(c.shared_availability, 0),
      'complementary_skills', nullif(c.complementary_skills, 0),
      'experience_fit', c.experience_fit
    ))
  from candidates c
  order by 2 desc, c.user_id
  limit 24;
$$;

create or replace function public.create_hacker_team(target_event uuid, team_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare new_team uuid;
begin
  if char_length(trim(team_name)) not between 2 and 80 then raise exception 'Team name must be 2 to 80 characters'; end if;
  if not exists (select 1 from public.applications a where a.event_id = target_event and a.applicant_id = (select auth.uid()) and a.role = 'hacker' and a.status = 'accepted') then
    raise exception 'Only accepted hackers can create teams';
  end if;
  if exists (select 1 from public.team_members tm join public.teams t on t.id = tm.team_id where t.event_id = target_event and tm.user_id = (select auth.uid())) then
    raise exception 'You already have a team for this event';
  end if;
  insert into public.teams (event_id, name, created_by) values (target_event, trim(team_name), (select auth.uid())) returning id into new_team;
  insert into public.team_members (team_id, user_id) values (new_team, (select auth.uid()));
  return new_team;
end;
$$;

create or replace function public.respond_team_invitation(target_invitation uuid, accept_invitation boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare invitation public.team_invitations%rowtype;
begin
  select * into invitation from public.team_invitations where id = target_invitation for update;
  if invitation.recipient_id is distinct from (select auth.uid()) or invitation.status <> 'pending' then raise exception 'Pending invitation not found'; end if;
  if accept_invitation then
    insert into public.team_members (team_id, user_id) values (invitation.team_id, (select auth.uid()));
  end if;
  update public.team_invitations set status = case when accept_invitation then 'accepted'::public.invitation_status else 'declined'::public.invitation_status end, responded_at = now() where id = target_invitation;
end;
$$;

create or replace function public.claim_mentor_request(target_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare request_event uuid;
begin
  select mr.event_id into request_event from public.mentor_requests mr where mr.id = target_request and mr.status = 'open' for update;
  if request_event is null then raise exception 'Open mentor request not found'; end if;
  if not exists (select 1 from public.applications a where a.event_id = request_event and a.applicant_id = (select auth.uid()) and a.role = 'mentor' and a.status = 'accepted') then
    raise exception 'Only accepted mentors can claim requests';
  end if;
  update public.mentor_requests set status = 'claimed', claimed_by = (select auth.uid()), claimed_at = now() where id = target_request;
end;
$$;

create or replace function public.join_volunteer_shift(target_shift uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare shift_event uuid; shift_capacity integer;
begin
  select vs.event_id, vs.capacity into shift_event, shift_capacity from public.volunteer_shifts vs where vs.id = target_shift for update;
  if shift_event is null then raise exception 'Shift not found'; end if;
  if not exists (select 1 from public.applications a where a.event_id = shift_event and a.applicant_id = (select auth.uid()) and a.role = 'volunteer' and a.status = 'accepted') then
    raise exception 'Only accepted volunteers can join shifts';
  end if;
  if (select count(*) from public.volunteer_shift_assignments vsa where vsa.shift_id = target_shift) >= shift_capacity then raise exception 'Shift is full'; end if;
  insert into public.volunteer_shift_assignments (shift_id, volunteer_id) values (target_shift, (select auth.uid())) on conflict do nothing;
end;
$$;

create policy profiles_team_context_read on public.profiles
for select to authenticated
using (
  exists (
    select 1 from public.matching_profiles target
    join public.matching_profiles viewer on viewer.event_id = target.event_id
    where target.user_id = profiles.id and target.opted_in
      and viewer.user_id = (select auth.uid()) and viewer.opted_in
  )
  or exists (
    select 1 from public.team_members target_member
    join public.team_members viewer_member on viewer_member.team_id = target_member.team_id
    where target_member.user_id = profiles.id and viewer_member.user_id = (select auth.uid())
  )
);

create or replace function private.guard_project_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
declare team_event uuid;
begin
  select t.event_id into team_event from public.teams t where t.id = new.team_id;
  if team_event is distinct from new.event_id then
    raise exception 'Project and team must belong to the same event';
  end if;
  if tg_op = 'UPDATE' and old.submitted_at is not null and (
    new.name, new.summary, new.github_url, new.demo_url, new.team_id, new.event_id, new.submitted_at
  ) is distinct from (
    old.name, old.summary, old.github_url, old.demo_url, old.team_id, old.event_id, old.submitted_at
  ) then raise exception 'Submitted project details are immutable'; end if;
  return new;
end;
$$;
create trigger projects_guard_submission before insert or update on public.projects for each row execute function private.guard_project_submission();

create or replace function private.guard_project_review_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  required_scores integer;
  rubric jsonb;
  score_entry record;
  numeric_score numeric;
begin
  if tg_op = 'UPDATE' and old.submitted_at is not null and new is distinct from old then raise exception 'Submitted project reviews are immutable'; end if;
  if new.submitted_at is not null then
    select e.project_rubric, jsonb_array_length(e.project_rubric -> 'criteria') into rubric, required_scores
    from public.projects p join public.events e on e.id = p.event_id where p.id = new.project_id;
    if jsonb_object_length(new.scores) is distinct from required_scores then raise exception 'Submitted project reviews need every rubric score'; end if;
    for score_entry in select * from jsonb_each(new.scores) loop
      if jsonb_typeof(score_entry.value) <> 'number' then raise exception 'Project rubric scores must be numeric'; end if;
      numeric_score := (score_entry.value #>> '{}')::numeric;
      if numeric_score <> trunc(numeric_score) or numeric_score not between 1 and 5 then raise exception 'Project rubric scores must be integers from 1 to 5'; end if;
      if not exists (select 1 from jsonb_array_elements(rubric -> 'criteria') criterion where criterion ->> 'key' = score_entry.key) then raise exception 'Project rubric score key is not configured'; end if;
    end loop;
  end if;
  return new;
end;
$$;
create trigger project_reviews_guard_submission before insert or update on public.project_reviews for each row execute function private.guard_project_review_submission();

revoke all on function public.team_match_candidates(uuid) from public, anon;
revoke all on function public.create_hacker_team(uuid, text) from public, anon;
revoke all on function public.respond_team_invitation(uuid, boolean) from public, anon;
revoke all on function public.claim_mentor_request(uuid) from public, anon;
revoke all on function public.join_volunteer_shift(uuid) from public, anon;
grant execute on function public.team_match_candidates(uuid) to authenticated;
grant execute on function public.create_hacker_team(uuid, text) to authenticated;
grant execute on function public.respond_team_invitation(uuid, boolean) to authenticated;
grant execute on function public.claim_mentor_request(uuid) to authenticated;
grant execute on function public.join_volunteer_shift(uuid) to authenticated;
revoke all on function private.guard_project_submission() from public, anon, authenticated;
revoke all on function private.guard_project_review_submission() from public, anon, authenticated;

-- Project judging is available only to accepted judge applicants for the same
-- event. Keeping this invariant in Postgres prevents privileged UI mistakes.
create or replace function private.guard_project_judge_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare project_event uuid;
begin
  select p.event_id into project_event from public.projects p where p.id = new.project_id;
  if project_event is null or not exists (
    select 1 from public.applications a
    where a.event_id = project_event and a.applicant_id = new.judge_id
      and a.role = 'judge' and a.status = 'accepted'
  ) then
    raise exception 'Project reviewers must be accepted judges for the project event';
  end if;
  return new;
end;
$$;

create trigger project_assignments_require_accepted_judge
before insert or update on public.project_review_assignments
for each row execute function private.guard_project_judge_assignment();

revoke all on function private.guard_project_judge_assignment() from public, anon, authenticated;

-- Close the last client-controlled columns once an application leaves draft.
create or replace function private.guard_application_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  is_organizer boolean;
begin
  if new.status = old.status then
    if old.status <> 'draft' and (
      new.form_version, new.applicant_id, new.event_id, new.role,
      new.submitted_at, new.withdrawn_at, new.decided_at, new.lock_version
    ) is distinct from (
      old.form_version, old.applicant_id, old.event_id, old.role,
      old.submitted_at, old.withdrawn_at, old.decided_at, old.lock_version
    ) then
      raise exception 'Submitted application fields are immutable';
    end if;
    return new;
  end if;

  is_organizer := actor is null or private.is_event_staff(old.event_id, array['organizer'::public.staff_role]);
  if actor = old.applicant_id then
    if not ((old.status = 'draft' and new.status = 'submitted') or (old.status in ('submitted', 'under_review', 'accepted', 'waitlisted') and new.status = 'withdrawn')) then
      raise exception 'Applicant status transition is not allowed';
    end if;
  elsif is_organizer then
    if not (
      (old.status = 'submitted' and new.status = 'under_review') or
      (old.status = 'under_review' and new.status in ('accepted', 'waitlisted', 'rejected')) or
      (old.status = 'waitlisted' and new.status in ('accepted', 'rejected'))
    ) then
      raise exception 'Organizer status transition is not allowed';
    end if;
  else
    raise exception 'Application status transition is not authorized';
  end if;

  new.lock_version := old.lock_version + 1;
  new.submitted_at := case when new.status = 'submitted' then coalesce(old.submitted_at, now()) else old.submitted_at end;
  new.withdrawn_at := case when new.status = 'withdrawn' then now() else old.withdrawn_at end;
  new.decided_at := case when new.status in ('accepted', 'waitlisted', 'rejected') then now() else old.decided_at end;
  return new;
end;
$$;

revoke all on function private.guard_application_transition() from public, anon, authenticated;

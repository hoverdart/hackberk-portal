-- The public test portal intentionally allows a newly signed-in person to claim
-- organizer access for its synthetic event. This function has no event or user
-- parameter, so it can only grant the caller membership in that one test event.
create or replace function public.claim_test_organizer_membership()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  test_event_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in account is required to claim test organizer access';
  end if;

  select id into test_event_id
  from public.events
  where is_active = true
    and is_synthetic = true;

  if test_event_id is null then
    raise exception 'No active test event is available for organizer signup';
  end if;

  insert into public.staff_members (event_id, user_id, role, created_by)
  values (test_event_id, (select auth.uid()), 'organizer'::public.staff_role, (select auth.uid()))
  on conflict (event_id, user_id, role) do nothing;
end;
$$;

revoke all on function public.claim_test_organizer_membership() from public, anon;
grant execute on function public.claim_test_organizer_membership() to authenticated;

-- UI guards provide a clear route, but a test organizer must not be able to
-- write applicant records by posting directly to the Data API.
create or replace function private.reject_organizer_application_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.staff_members staff
    where staff.event_id = new.event_id
      and staff.user_id = new.applicant_id
      and staff.role = 'organizer'::public.staff_role
  ) then
    raise exception using
      errcode = '42501',
      message = 'Organizer accounts cannot create or submit applicant applications';
  end if;
  return new;
end;
$$;

create trigger applications_reject_organizer_writes
before insert or update on public.applications
for each row execute function private.reject_organizer_application_write();

create or replace function private.reject_organizer_answer_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_application_id uuid;
begin
  target_application_id := case when tg_op = 'DELETE' then old.application_id else new.application_id end;

  if exists (
    select 1
    from public.applications application
    join public.staff_members staff
      on staff.event_id = application.event_id
     and staff.user_id = application.applicant_id
     and staff.role = 'organizer'::public.staff_role
    where application.id = target_application_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'Organizer accounts cannot change applicant application answers';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger application_answers_reject_organizer_writes
before insert or update or delete on public.application_answers
for each row execute function private.reject_organizer_answer_write();

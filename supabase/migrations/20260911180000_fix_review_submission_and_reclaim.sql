-- Three defects in the organizer review pipeline, all of which surfaced as the
-- same opaque "Review save failed" message in the interface.

-- 1. `private.guard_review_write` called `jsonb_object_length`, which is not a
--    PostgreSQL function (verified against the deployed instance: `select
--    count(*) from pg_proc where proname = 'jsonb_object_length'` returns 0).
--    plpgsql resolves function names at run time, not at CREATE FUNCTION time,
--    so the migration applied cleanly and the call only failed when reached —
--    which is the `status = 'submitted'` branch. Every draft save worked and
--    every submit raised 42883. `scores = '{}'::jsonb` is the direct test for
--    "no criteria were scored" and needs no function at all.
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
    if new.recommendation is null or new.scores = '{}'::jsonb then
      raise exception 'Submitted reviews need scores and a recommendation';
    end if;
    new.submitted_at := case when tg_op = 'UPDATE' then coalesce(old.submitted_at, now()) else now() end;
  end if;
  return new;
end;
$$;

-- 2. `application_reviews` carries two unique keys: `assignment_id` and
--    `(application_id, reviewer_id)`. The action upserts on the first only, so
--    once an organizer held a second assignment for an application they had
--    already reviewed, the insert raised 23505 on the *undeclared* constraint
--    and no ON CONFLICT clause could catch it. The second key is redundant with
--    the first — an assignment already pins exactly one (application, reviewer)
--    pair, enforced by the guard above — so drop it rather than teach every
--    caller about two conflict targets.
alter table public.application_reviews
  drop constraint if exists application_reviews_application_id_reviewer_id_key;

-- 3. Reporting a conflict set `review_assignments.status = 'conflict'` but left
--    the row in place, and `claim_application_review` only ever INSERTed. With
--    `unique (application_id, reviewer_id)` on that table, the organizer who
--    recused themselves could never claim the application again — and in the
--    single-organizer configuration that is every organizer, so the application
--    became permanently unreviewable. Reactivate the existing row instead.
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
  on conflict (application_id, reviewer_id) do update
    set status = 'draft', conflict_reason = null, assigned_at = now()
  returning id into assignment_id;

  if current_status = 'submitted' then
    update public.applications set status = 'under_review' where id = target_application;
  end if;
  return assignment_id;
end;
$$;

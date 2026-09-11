-- Volunteers could check in and never check out, so "hours worked" — the number
-- an organizer actually needs at the end of an event, and the one a volunteer
-- wants for their own records — could not be derived from anything.
--
-- Paired with `checked_in_at`, which has existed since the first migration.
alter table public.volunteer_shift_assignments
  add column if not exists checked_out_at timestamptz;

-- A shift cannot end before it started. The check tolerates either column being
-- null, because "joined but not arrived" and "arrived but still working" are
-- both normal states.
alter table public.volunteer_shift_assignments
  drop constraint if exists volunteer_shift_assignments_checkout_after_checkin;
alter table public.volunteer_shift_assignments
  add constraint volunteer_shift_assignments_checkout_after_checkin
  check (checked_out_at is null or (checked_in_at is not null and checked_out_at >= checked_in_at));

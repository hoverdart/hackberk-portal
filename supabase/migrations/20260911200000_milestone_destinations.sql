-- Deadlines pointed everyone at an application form.
--
-- The event-day feed derived a link from the milestone's audience, so every
-- deadline sent you to `/applications/<role>` whatever it was actually about:
-- "Team lock" opened the hacker application rather than Team Match, and
-- "Shift confirmations due" opened the volunteer application rather than the
-- shift board. A deadline needs to know where its work is done, so record it
-- rather than guessing from the audience.
alter table public.event_milestones
  add column if not exists link_path text;

alter table public.event_milestones
  drop constraint if exists event_milestones_link_path_is_relative;
-- Relative paths only: a milestone is a pointer into this portal, never a way
-- to send a signed-in applicant somewhere else.
alter table public.event_milestones
  add constraint event_milestones_link_path_is_relative
  check (link_path is null or link_path ~ '^/[A-Za-z0-9/_#-]*$');

update public.event_milestones set link_path = '/teams'
  where audience = 'hacker' and title = 'Team lock';
update public.event_milestones set link_path = '/judging'
  where audience = 'judge';
update public.event_milestones set link_path = '/ops#mentor'
  where audience = 'mentor';
update public.event_milestones set link_path = '/ops#volunteer'
  where audience = 'volunteer';

-- "Applications close" was seeded against the hacker audience, but it is the one
-- deadline that genuinely applies to everybody: the judge, mentor and volunteer
-- forms close at the same moment. Audience is what decides who sees a deadline,
-- so leaving it role-scoped both hid it from three roles and, because the feed
-- matched on any application rather than an accepted one, showed the other
-- role-specific deadlines to people who merely had a draft.
update public.event_milestones
set audience = null, link_path = '/dashboard'
where title = 'Applications close';

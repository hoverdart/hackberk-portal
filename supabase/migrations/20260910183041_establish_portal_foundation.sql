-- Hackathons @ Berkeley Portal: multi-event foundation.
--
-- The browser always connects as anon/authenticated. Every exposed table therefore
-- combines explicit grants with RLS; privileged staff membership is never inferred
-- from editable profile or auth metadata.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.application_role as enum ('hacker', 'judge', 'mentor', 'volunteer');
create type public.application_status as enum (
  'draft', 'submitted', 'under_review', 'accepted', 'waitlisted', 'rejected', 'withdrawn'
);
create type public.staff_role as enum ('organizer', 'reviewer');
create type public.review_status as enum ('draft', 'submitted', 'conflict');
create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.request_status as enum ('open', 'claimed', 'resolved', 'cancelled');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  tagline text not null,
  venue text not null,
  timezone text not null default 'America/Los_Angeles',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  applications_open_at timestamptz not null,
  applications_close_at timestamptz not null,
  application_forms jsonb not null default '{}'::jsonb,
  application_rubric jsonb not null default '{}'::jsonb,
  project_rubric jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  is_synthetic boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (applications_open_at < applications_close_at)
);

create unique index events_one_active_idx on public.events (is_active) where is_active;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  preferred_name text check (preferred_name is null or char_length(preferred_name) <= 80),
  school text check (school is null or char_length(school) <= 160),
  graduation_year integer check (graduation_year is null or graduation_year between 2020 and 2040),
  pronouns text check (pronouns is null or char_length(pronouns) <= 80),
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_members (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  primary key (event_id, user_id, role)
);
create index staff_members_user_event_idx on public.staff_members (user_id, event_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  applicant_id uuid not null references auth.users (id) on delete cascade,
  role public.application_role not null,
  status public.application_status not null default 'draft',
  form_version integer not null default 1 check (form_version > 0),
  lock_version integer not null default 1 check (lock_version > 0),
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, applicant_id, role)
);
create index applications_event_role_status_idx on public.applications (event_id, role, status, created_at desc);
create index applications_applicant_event_idx on public.applications (applicant_id, event_id);

create table public.application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  section_key text not null check (section_key ~ '^[a-z0-9_]+$'),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  is_identity_sensitive boolean not null default false,
  answer_version integer not null default 1 check (answer_version > 0),
  updated_at timestamptz not null default now(),
  unique (application_id, section_key)
);
create index application_answers_application_idx on public.application_answers (application_id);

create table public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  status public.review_status not null default 'draft',
  conflict_reason text,
  assigned_at timestamptz not null default now(),
  unique (application_id, reviewer_id),
  check ((status = 'conflict') = (conflict_reason is not null))
);
create index review_assignments_reviewer_status_idx on public.review_assignments (reviewer_id, status, assigned_at);

create table public.application_reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.review_assignments (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  scores jsonb not null default '{}'::jsonb check (jsonb_typeof(scores) = 'object'),
  recommendation public.application_status check (recommendation in ('accepted', 'waitlisted', 'rejected')),
  private_notes text,
  status public.review_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, reviewer_id)
);
create index application_reviews_application_status_idx on public.application_reviews (application_id, status);

create table public.audit_log (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_event_created_idx on public.audit_log (event_id, created_at desc, id desc);

create table public.matching_profiles (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  experience_level smallint not null default 1 check (experience_level between 1 and 5),
  goals text[] not null default '{}',
  availability text[] not null default '{}',
  bio text not null default '' check (char_length(bio) <= 800),
  opted_in boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index matching_profiles_opted_in_idx on public.matching_profiles (event_id, user_id) where opted_in;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index teams_event_idx on public.teams (event_id, created_at desc);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user_idx on public.team_members (user_id, team_id);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  status public.invitation_status not null default 'pending',
  message text check (message is null or char_length(message) <= 400),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> recipient_id)
);
create unique index team_invitations_one_pending_idx on public.team_invitations (team_id, recipient_id) where status = 'pending';
create index team_invitations_recipient_status_idx on public.team_invitations (recipient_id, status, created_at desc);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  team_id uuid not null unique references public.teams (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  summary text not null check (char_length(summary) between 20 and 1200),
  github_url text not null check (github_url ~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$'),
  demo_url text,
  submitted_at timestamptz,
  github_cache jsonb not null default '{}'::jsonb,
  github_cached_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_event_submitted_idx on public.projects (event_id, submitted_at) where submitted_at is not null;

create table public.project_review_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  judge_id uuid not null references auth.users (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (project_id, judge_id)
);
create index project_review_assignments_judge_idx on public.project_review_assignments (judge_id, assigned_at);

create table public.project_reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.project_review_assignments (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  judge_id uuid not null references auth.users (id) on delete cascade,
  scores jsonb not null default '{}'::jsonb check (jsonb_typeof(scores) = 'object'),
  notes text,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (project_id, judge_id)
);

create table public.event_milestones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  audience public.application_role,
  title text not null,
  description text not null default '',
  due_at timestamptz not null,
  sort_order integer not null default 0
);
create index event_milestones_event_due_idx on public.event_milestones (event_id, due_at, sort_order);

create table public.mentor_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  claimed_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 4 and 120),
  description text not null check (char_length(description) between 10 and 1200),
  expertise_tags text[] not null default '{}',
  status public.request_status not null default 'open',
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  resolved_at timestamptz
);
create index mentor_requests_event_status_idx on public.mentor_requests (event_id, status, created_at);
create index mentor_requests_claimed_by_idx on public.mentor_requests (claimed_by, status) where claimed_by is not null;

create table public.volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 500),
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  check (starts_at < ends_at)
);
create index volunteer_shifts_event_starts_idx on public.volunteer_shifts (event_id, starts_at);

create table public.volunteer_shift_assignments (
  shift_id uuid not null references public.volunteer_shifts (id) on delete cascade,
  volunteer_id uuid not null references auth.users (id) on delete cascade,
  checked_in_at timestamptz,
  checklist_state jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist_state) = 'object'),
  primary key (shift_id, volunteer_id)
);
create index volunteer_shift_assignments_volunteer_idx on public.volunteer_shift_assignments (volunteer_id, shift_id);

-- Shared timestamp trigger keeps optimistic-concurrency DTOs honest.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_touch before update on public.events for each row execute function private.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger applications_touch before update on public.applications for each row execute function private.touch_updated_at();
create trigger application_answers_touch before update on public.application_answers for each row execute function private.touch_updated_at();
create trigger application_reviews_touch before update on public.application_reviews for each row execute function private.touch_updated_at();
create trigger matching_profiles_touch before update on public.matching_profiles for each row execute function private.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function private.touch_updated_at();
create trigger project_reviews_touch before update on public.project_reviews for each row execute function private.touch_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New applicant'))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.is_event_staff(target_event uuid, allowed_roles public.staff_role[] default array['organizer'::public.staff_role, 'reviewer'::public.staff_role])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_members sm
    where sm.event_id = target_event
      and sm.user_id = (select auth.uid())
      and sm.role = any (allowed_roles)
  );
$$;

create or replace function private.is_application_reviewer(target_application uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.review_assignments ra
    where ra.application_id = target_application
      and ra.reviewer_id = (select auth.uid())
  );
$$;

create or replace function private.is_project_judge(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_review_assignments pra
    where pra.project_id = target_project
      and pra.judge_id = (select auth.uid())
  );
$$;

create or replace function private.is_team_member(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = target_team and tm.user_id = (select auth.uid())
  );
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_event_staff(uuid, public.staff_role[]) to authenticated;
grant execute on function private.is_application_reviewer(uuid) to authenticated;
grant execute on function private.is_project_judge(uuid) to authenticated;
grant execute on function private.is_team_member(uuid) to authenticated;

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
    if old.status <> 'draft' and (new.form_version, new.applicant_id, new.event_id, new.role) is distinct from (old.form_version, old.applicant_id, old.event_id, old.role) then
      raise exception 'Submitted application identity is immutable';
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
create trigger applications_guard_transition before update on public.applications for each row execute function private.guard_application_transition();

create or replace function private.guard_answer_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare current_status public.application_status;
begin
  select a.status into current_status
  from public.applications a
  where a.id = coalesce(new.application_id, old.application_id)
  for update;
  if current_status <> 'draft' then
    raise exception 'Answers are locked after submission';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_op = 'UPDATE' then new.answer_version := old.answer_version + 1; end if;
  return new;
end;
$$;
create trigger application_answers_guard before insert or update or delete on public.application_answers for each row execute function private.guard_answer_mutation();

create or replace function private.limit_review_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare applicant uuid;
begin
  perform 1 from public.applications where id = new.application_id for update;
  if (select count(*) from public.review_assignments where application_id = new.application_id) >= 2 then
    raise exception 'Each application may have at most two reviewers';
  end if;
  select applicant_id into applicant from public.applications where id = new.application_id;
  if applicant = new.reviewer_id then raise exception 'Applicants cannot review themselves'; end if;
  return new;
end;
$$;
create trigger review_assignments_limit before insert on public.review_assignments for each row execute function private.limit_review_assignments();

create or replace function private.limit_team_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.teams where id = new.team_id for update;
  if (select count(*) from public.team_members where team_id = new.team_id) >= 4 then
    raise exception 'Teams are capped at four people';
  end if;
  if exists (
    select 1
    from public.team_members tm
    join public.teams existing_team on existing_team.id = tm.team_id
    join public.teams target_team on target_team.id = new.team_id
    where tm.user_id = new.user_id
      and existing_team.event_id = target_team.event_id
  ) then
    raise exception 'A hacker may join only one team per event';
  end if;
  return new;
end;
$$;
create trigger team_members_limit before insert on public.team_members for each row execute function private.limit_team_size();

-- RLS is the final authority. UI visibility is only a convenience.
alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.applications enable row level security;
alter table public.application_answers enable row level security;
alter table public.review_assignments enable row level security;
alter table public.application_reviews enable row level security;
alter table public.audit_log enable row level security;
alter table public.matching_profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.project_review_assignments enable row level security;
alter table public.project_reviews enable row level security;
alter table public.event_milestones enable row level security;
alter table public.mentor_requests enable row level security;
alter table public.volunteer_shifts enable row level security;
alter table public.volunteer_shift_assignments enable row level security;

create policy events_public_read on public.events for select to anon, authenticated using (true);
create policy events_organizer_write on public.events for all to authenticated using (private.is_event_staff(id, array['organizer'::public.staff_role])) with check (private.is_event_staff(id, array['organizer'::public.staff_role]));

create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_staff_read on public.profiles for select to authenticated using (exists (select 1 from public.applications a where a.applicant_id = profiles.id and private.is_event_staff(a.event_id)));

create policy staff_members_self_or_organizer_read on public.staff_members for select to authenticated using (user_id = (select auth.uid()) or private.is_event_staff(event_id, array['organizer'::public.staff_role]));
create policy staff_members_organizer_write on public.staff_members for all to authenticated using (private.is_event_staff(event_id, array['organizer'::public.staff_role])) with check (private.is_event_staff(event_id, array['organizer'::public.staff_role]));

create policy applications_owner_read on public.applications for select to authenticated using (applicant_id = (select auth.uid()));
create policy applications_owner_insert on public.applications for insert to authenticated with check (applicant_id = (select auth.uid()) and status = 'draft');
create policy applications_owner_update on public.applications for update to authenticated using (applicant_id = (select auth.uid())) with check (applicant_id = (select auth.uid()));
create policy applications_staff_read on public.applications for select to authenticated using (private.is_event_staff(event_id) or private.is_application_reviewer(id));
create policy applications_organizer_update on public.applications for update to authenticated using (private.is_event_staff(event_id, array['organizer'::public.staff_role])) with check (private.is_event_staff(event_id, array['organizer'::public.staff_role]));

create policy answers_owner_all on public.application_answers for all to authenticated using (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = (select auth.uid()))) with check (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = (select auth.uid()) and a.status = 'draft'));
create policy answers_blind_reviewer_read on public.application_answers for select to authenticated using (not is_identity_sensitive and private.is_application_reviewer(application_id));
create policy answers_organizer_read on public.application_answers for select to authenticated using (exists (select 1 from public.applications a where a.id = application_id and private.is_event_staff(a.event_id, array['organizer'::public.staff_role])));

create policy review_assignments_reviewer_read on public.review_assignments for select to authenticated using (reviewer_id = (select auth.uid()));
create policy review_assignments_organizer_all on public.review_assignments for all to authenticated using (exists (select 1 from public.applications a where a.id = application_id and private.is_event_staff(a.event_id, array['organizer'::public.staff_role]))) with check (exists (select 1 from public.applications a where a.id = application_id and private.is_event_staff(a.event_id, array['organizer'::public.staff_role])));

create policy application_reviews_reviewer_all on public.application_reviews for all to authenticated using (reviewer_id = (select auth.uid())) with check (reviewer_id = (select auth.uid()) and exists (select 1 from public.review_assignments ra where ra.id = assignment_id and ra.application_id = application_id and ra.reviewer_id = (select auth.uid())));
create policy application_reviews_organizer_read on public.application_reviews for select to authenticated using (exists (select 1 from public.applications a where a.id = application_id and private.is_event_staff(a.event_id, array['organizer'::public.staff_role])));

create policy audit_log_organizer_read on public.audit_log for select to authenticated using (private.is_event_staff(event_id, array['organizer'::public.staff_role]));

create policy matching_profiles_accepted_read on public.matching_profiles for select to authenticated using (opted_in and exists (select 1 from public.applications a where a.event_id = matching_profiles.event_id and a.applicant_id = (select auth.uid()) and a.role = 'hacker' and a.status = 'accepted'));
create policy matching_profiles_owner_all on public.matching_profiles for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and exists (select 1 from public.applications a where a.event_id = matching_profiles.event_id and a.applicant_id = (select auth.uid()) and a.role = 'hacker' and a.status = 'accepted'));

create policy teams_member_read on public.teams for select to authenticated using (private.is_team_member(id) or exists (select 1 from public.team_invitations ti where ti.team_id = id and ti.recipient_id = (select auth.uid())));
create policy teams_accepted_insert on public.teams for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.applications a where a.event_id = teams.event_id and a.applicant_id = (select auth.uid()) and a.role = 'hacker' and a.status = 'accepted'));
create policy teams_creator_update on public.teams for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy team_members_member_read on public.team_members for select to authenticated using (private.is_team_member(team_id) or user_id = (select auth.uid()));
create policy team_members_creator_insert on public.team_members for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.teams t where t.id = team_id and t.created_by = (select auth.uid())));
create policy team_members_self_delete on public.team_members for delete to authenticated using (user_id = (select auth.uid()));
create policy invitations_parties_read on public.team_invitations for select to authenticated using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()) or private.is_team_member(team_id));
create policy invitations_member_insert on public.team_invitations for insert to authenticated with check (sender_id = (select auth.uid()) and private.is_team_member(team_id));
create policy invitations_recipient_update on public.team_invitations for update to authenticated using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

create policy projects_team_all on public.projects for all to authenticated using (private.is_team_member(team_id)) with check (private.is_team_member(team_id));
create policy projects_judge_read on public.projects for select to authenticated using (submitted_at is not null and private.is_project_judge(id));
create policy projects_organizer_read on public.projects for select to authenticated using (private.is_event_staff(event_id, array['organizer'::public.staff_role]));
create policy project_assignments_judge_read on public.project_review_assignments for select to authenticated using (judge_id = (select auth.uid()));
create policy project_assignments_organizer_all on public.project_review_assignments for all to authenticated using (exists (select 1 from public.projects p where p.id = project_id and private.is_event_staff(p.event_id, array['organizer'::public.staff_role]))) with check (exists (select 1 from public.projects p where p.id = project_id and private.is_event_staff(p.event_id, array['organizer'::public.staff_role])));
create policy project_reviews_judge_all on public.project_reviews for all to authenticated using (judge_id = (select auth.uid())) with check (judge_id = (select auth.uid()) and exists (select 1 from public.project_review_assignments pra where pra.id = assignment_id and pra.project_id = project_id and pra.judge_id = (select auth.uid())));
create policy project_reviews_organizer_read on public.project_reviews for select to authenticated using (exists (select 1 from public.projects p where p.id = project_id and private.is_event_staff(p.event_id, array['organizer'::public.staff_role])));

create policy milestones_event_read on public.event_milestones for select to authenticated using (true);
create policy milestones_organizer_all on public.event_milestones for all to authenticated using (private.is_event_staff(event_id, array['organizer'::public.staff_role])) with check (private.is_event_staff(event_id, array['organizer'::public.staff_role]));
create policy mentor_requests_event_read on public.mentor_requests for select to authenticated using (requester_id = (select auth.uid()) or claimed_by = (select auth.uid()) or private.is_event_staff(event_id) or exists (select 1 from public.applications a where a.event_id = mentor_requests.event_id and a.applicant_id = (select auth.uid()) and a.role = 'mentor' and a.status = 'accepted'));
create policy mentor_requests_hacker_insert on public.mentor_requests for insert to authenticated with check (requester_id = (select auth.uid()) and exists (select 1 from public.applications a where a.event_id = mentor_requests.event_id and a.applicant_id = (select auth.uid()) and a.role = 'hacker' and a.status = 'accepted'));
create policy mentor_requests_participant_update on public.mentor_requests for update to authenticated using (requester_id = (select auth.uid()) or claimed_by = (select auth.uid()) or private.is_event_staff(event_id)) with check (requester_id = (select auth.uid()) or claimed_by = (select auth.uid()) or private.is_event_staff(event_id));
create policy shifts_accepted_read on public.volunteer_shifts for select to authenticated using (private.is_event_staff(event_id) or exists (select 1 from public.applications a where a.event_id = volunteer_shifts.event_id and a.applicant_id = (select auth.uid()) and a.role = 'volunteer' and a.status = 'accepted'));
create policy shifts_organizer_all on public.volunteer_shifts for all to authenticated using (private.is_event_staff(event_id, array['organizer'::public.staff_role])) with check (private.is_event_staff(event_id, array['organizer'::public.staff_role]));
create policy shift_assignments_self_read on public.volunteer_shift_assignments for select to authenticated using (volunteer_id = (select auth.uid()) or exists (select 1 from public.volunteer_shifts s where s.id = shift_id and private.is_event_staff(s.event_id)));
create policy shift_assignments_self_insert on public.volunteer_shift_assignments for insert to authenticated with check (volunteer_id = (select auth.uid()) and exists (select 1 from public.volunteer_shifts s join public.applications a on a.event_id = s.event_id where s.id = shift_id and a.applicant_id = (select auth.uid()) and a.role = 'volunteer' and a.status = 'accepted' and (select count(*) from public.volunteer_shift_assignments vsa where vsa.shift_id = shift_id) < s.capacity));
create policy shift_assignments_self_update on public.volunteer_shift_assignments for update to authenticated using (volunteer_id = (select auth.uid())) with check (volunteer_id = (select auth.uid()));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.events to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.staff_members to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select, insert, update, delete on public.application_answers to authenticated;
grant select, insert, update, delete on public.review_assignments to authenticated;
grant select, insert, update on public.application_reviews to authenticated;
grant select on public.audit_log to authenticated;
grant select, insert, update on public.matching_profiles to authenticated;
grant select, insert, update on public.teams to authenticated;
grant select, insert, delete on public.team_members to authenticated;
grant select, insert, update on public.team_invitations to authenticated;
grant select, insert, update on public.projects to authenticated;
grant select, insert, update, delete on public.project_review_assignments to authenticated;
grant select, insert, update on public.project_reviews to authenticated;
grant select, insert, update, delete on public.event_milestones to authenticated;
grant select, insert, update on public.mentor_requests to authenticated;
grant select, insert, update, delete on public.volunteer_shifts to authenticated;
grant select, insert, update on public.volunteer_shift_assignments to authenticated;
grant usage, select on sequence public.audit_log_id_seq to authenticated;

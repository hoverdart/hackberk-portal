# Portal architecture

The portal is a multi-event Next.js App Router application backed by Supabase Auth and Postgres. Browser requests use only the publishable key. `proxy.ts` refreshes cookies and provides an optimistic redirect, while every page, Server Action, and Route Handler repeats authorization close to the data source. Postgres grants and Row Level Security remain the final authority.

## Data boundaries

- `profiles` contains shared identity data. One user can own one `applications` row per event and role.
- `application_answers.is_identity_sensitive` gates applicant identity out of the blind-review packet. It is a phase gate rather than a permanent separation: once an organizer submits a blind review, `getReviewWorkspace` also returns the applicant's profile and their logistics answers, and the queue stops masking their name. Both are withheld by the query rather than hidden by the page, so nothing identifying is in the payload before a score exists.
- Logistics stays out of the scoring packet even though it identifies nobody. Availability, dietary needs and accommodations are things an organizer must know to run the event and must never be scored on.
- `staff_members` is the only organizer authority for application grading. Bootstrap it through an administrative database connection, never auth metadata.
- `review_assignments` has one active organizer-owned row per application. A submitted `application_reviews` row is its auditable blind rubric record; a conflict releases the application for another organizer to claim.
- Team Match is accepted-hacker-only. Ranking is deterministic and explainable; transactional functions and row locks enforce one team per event and four people per team.
- Project Lens accepts only canonical public `github.com/{owner}/{repository}` URLs. The server constructs GitHub API destinations, enforces time and byte limits, caches metadata, renders source as escaped highlighted text, and never executes repository code.
- Project review assignments require an accepted judge application for the same event. Judges can read only submitted projects explicitly assigned to them.
- Mentor claims and volunteer shift joins are transactional; shift joins lock capacity before insertion.
- A mentor resolves the request they claimed; the hacker who raised it sees its state and may withdraw one nobody has taken. Both writes are already covered by `mentor_requests_participant_update`, which allows either participant.
- `volunteer_shift_assignments` carries `checked_in_at` and `checked_out_at`; hours worked are derived from the pair, never stored. A check constraint keeps a checkout from preceding its check-in while allowing either stamp to be absent.
- Team, project, mentor, and shift tables share the event foreign key so the same components and policies support future events.
- `application_reviews.assignment_id` is the sole conflict target for a review upsert. The table once also carried `unique (application_id, reviewer_id)`, which no `on conflict` clause could name alongside it, so a re-claimed assignment failed permanently with 23505.
- audit rows are append-only from the application-status trigger; decisions preserve before/after state and actor identity.
- Organizer shift forms interpret browser `datetime-local` values in the event's IANA time zone before storing UTC instants, so a local operational time cannot drift with the server's time zone.

## Interface boundaries

- One layout owns the signed-in shell. `(portal)` and `(organizer)` nest inside
  `app/(app)`, whose layout renders the frame once; Next caches a layout on the
  client, so the rail persists across every navigation instead of remounting at
  the group boundary.
- The rail is built from `getAcceptedRoles`, the single place that decides which
  roles an account holds. Holding a role means having an accepted application
  for it, not choosing one at sign-up.
- Appearance for anything in `components/ui/` is defined in
  `app/styles/components.css` and nowhere else. Pages set layout only.

## Route boundaries

- Public: landing, `/about`, sign-up, sign-in, verification callback, forgot/reset password, and legal placeholders. `/design/hero` renders the signed-in shell without a session and is what the browser tests assert against.
- Applicant: dashboard, four role applications, Team Match, Project Lens, and the event-day page.
- Judge: `/judging` lists assigned projects and which still need a score; each opens a rubric score sheet.
- Organizer: the paginated application queue, review workspaces, decisions, CSV export, and event operations for judge assignment, help requests, volunteer shifts, and decision history.

Every protected page and Server Action repeats authorization near its query. `proxy.ts` is an optimistic cookie-refresh and redirect layer, not an authorization boundary.

## Local database

1. Create `.env` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `CONNECTION_URL`, using a Supabase session-pooler URL for the last.
2. Start Docker, then run `npm run db:start` and `npm run db:reset`.
3. Run `npm run db:test` for pgTAP policies and constraints.
4. Regenerate TypeScript types with `npm run db:types` after every schema change.

For a real event, bootstrap an organizer after they create an account by running a parameterized statement through the SQL editor or `psql`:

```sql
insert into public.staff_members (event_id, user_id, role, created_by)
values (:event_id, :user_id, 'organizer', :user_id);
```

Do not expose `CONNECTION_URL`, a secret/service-role key, or GitHub token to a `NEXT_PUBLIC_` variable.

The synthetic test event additionally exposes a deliberately constrained self-service organizer signup: it can grant only the signed-in caller membership in the active synthetic event. It must not be reused for a real event.

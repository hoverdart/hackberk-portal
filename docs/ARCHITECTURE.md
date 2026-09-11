# Portal architecture

The portal is a multi-event Next.js App Router application backed by Supabase Auth and Postgres. Browser requests use only the publishable key. `proxy.ts` refreshes cookies and provides an optimistic redirect, while every page, Server Action, and Route Handler repeats authorization close to the data source. Postgres grants and Row Level Security remain the final authority.

## Data boundaries

- `profiles` contains shared identity data. One user can own one `applications` row per event and role.
- `application_answers.is_identity_sensitive` separates applicant identity from blind-review content.
- `staff_members` is the only organizer authority for application grading. Bootstrap it through an administrative database connection, never auth metadata.
- `review_assignments` has one active organizer-owned row per application. A submitted `application_reviews` row is its auditable blind rubric record; a conflict releases the application for another organizer to claim.
- Team Match is accepted-hacker-only. Ranking is deterministic and explainable; transactional functions and row locks enforce one team per event and four people per team.
- Project Lens accepts only canonical public `github.com/{owner}/{repository}` URLs. The server constructs GitHub API destinations, enforces time and byte limits, caches metadata, renders source as escaped highlighted text, and never executes repository code.
- Project review assignments require an accepted judge application for the same event. Judges can read only submitted projects explicitly assigned to them.
- Mentor claims and volunteer shift joins are transactional; shift joins lock capacity before insertion.
- Team, project, mentor, and shift tables share the event foreign key so the same components and policies support future events.
- audit rows are append-only from the application-status trigger; decisions preserve before/after state and actor identity.
- Organizer shift forms interpret browser `datetime-local` values in the event's IANA time zone before storing UTC instants, so a local operational time cannot drift with the server's time zone.

## Route boundaries

- Public: landing, sign-up, sign-in, verification callback, forgot/reset password, and legal placeholders.
- Applicant: dashboard, four role applications, Team Match, Project Lens, and Role Ops.
- Judge: assigned project lenses and rubric score sheets surfaced through Role Ops.
- Organizer: paginated application control, blind-review workspaces, decisions, CSV export, and the operations docket for project assignment, mentor requests, volunteer shifts, event context, and audit history.

Every protected page and Server Action repeats authorization near its query. `proxy.ts` is an optimistic cookie-refresh and redirect layer, not an authorization boundary.

## Local database

1. Copy `.env.example` to `.env` and use a Supabase session-pooler URL for `CONNECTION_URL`.
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

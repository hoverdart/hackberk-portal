# Portal architecture

The portal is a multi-event Next.js App Router application backed by Supabase Auth and Postgres. Browser requests use only the publishable key. `proxy.ts` refreshes cookies and provides an optimistic redirect, while every page, Server Action, and Route Handler repeats authorization close to the data source. Postgres grants and Row Level Security remain the final authority.

## Data boundaries

- `profiles` contains shared identity data. One user can own one `applications` row per event and role.
- `application_answers.is_identity_sensitive` separates applicant identity from blind-review content.
- `staff_members` is the only organizer/reviewer authority. Bootstrap it through an administrative database connection, never auth metadata.
- `review_assignments` is capped at two rows per application. A submitted `application_reviews` row is independent from the other reviewer.
- team, project, mentor, and shift tables share the event foreign key so the same components and policies support future events.
- audit rows are append-only from application code; decisions preserve before/after state and actor identity.

## Local database

1. Copy `.env.example` to `.env` and use a Supabase session-pooler URL for `CONNECTION_URL`.
2. Start Docker, then run `npm run db:start` and `npm run db:reset`.
3. Run `npm run db:test` for pgTAP policies and constraints.
4. Regenerate TypeScript types with `npm run db:types` after every schema change.

To bootstrap an organizer after they create and verify an account, run a parameterized statement through the SQL editor or `psql`:

```sql
insert into public.staff_members (event_id, user_id, role, created_by)
values (:event_id, :user_id, 'organizer', :user_id);
```

Do not expose `CONNECTION_URL`, a secret/service-role key, or GitHub token to a `NEXT_PUBLIC_` variable.

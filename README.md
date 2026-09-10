# Hackathons @ Berkeley · Run of Show

A multi-event portal for hacker, judge, mentor, and volunteer applications; blind organizer review; team formation; safe public GitHub project review; and event-day operations.

## Start locally

```bash
npm install
cp .env.example .env
npm run dev
```

The app requires a Supabase project with email verification enabled. Supabase's default SMTP is intentionally limited; configure project email delivery before a public launch.

## Migrations

Link once per machine, then push whenever `supabase/migrations` changes:

```bash
npx supabase link --project-ref <your-project-ref>
npm run db:push      # applies every migration the remote is missing
npm run db:status    # lists local vs. remote migration versions
npm run db:new <name>  # scaffolds a new timestamped migration
```

`CONNECTION_URL` must be the **session pooler** string from Dashboard → Project Settings → Database, not the `db.<ref>.supabase.co` direct string. The direct host is IPv6-only and is unreachable from most home and office networks.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Database tests require Docker. The pgTAP suite covers status transitions, team capacity, organizer and reviewer access, blind-answer filtering, judge project scope, and cross-user RLS denial:

```bash
npm run db:reset && npm run db:test
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for security boundaries and organizer bootstrap instructions. `PRODUCT.md` records product truth; the final verified interface system will be documented in `DESIGN.md`.

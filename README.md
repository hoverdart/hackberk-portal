# Hackathons @ Berkeley · Run of Show

A multi-event portal for hacker, judge, mentor, and volunteer applications; blind organizer review; team formation; safe public GitHub project review; and event-day operations.

## Start locally

```bash
npm install
cp .env.example .env
npm run dev
```

The app requires a Supabase project with email verification enabled. Apply `supabase/migrations` and `supabase/seed.sql` before testing authenticated workflows. Supabase's default SMTP is intentionally limited; configure project email delivery before a public launch.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Database and browser suites are separate because they require Docker and test identities:

```bash
npm run db:reset && npm run db:test
npm run test:e2e
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for security boundaries and organizer bootstrap instructions. `PRODUCT.md` records product truth; the final verified interface system will be documented in `DESIGN.md`.

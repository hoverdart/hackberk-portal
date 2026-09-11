# Backathons at Herkeley

A multi-event portal for hacker, judge, mentor, and volunteer applications; blind organizer review; team formation; safe public GitHub project review; and event-day operations.

> **Sample data.** Backathons at Herkeley is a fictional organization, and the
> seeded "Herkeley Build 2027" event, its applicants, reviews, teams, and
> projects are all invented. The event row carries `is_synthetic = true` so the
> product can tell sample data from a real cycle. See `/about` in the running
> app for the same note in context.

## Start locally

```bash
npm install
cp .env.local.example .env   # or create .env with the three variables below
npm run dev
```

The app creates an authenticated session immediately after password sign-up; keep **Confirm email** disabled in Supabase Auth to match that flow. Configure a production SMTP provider before launch so password-reset and email-change messages can be delivered.

For this synthetic test portal, the sign-up screen also offers **Create an organizer account**. It grants organizer membership only for the active synthetic event and intentionally blocks that account from creating applicant applications. Do not carry that self-service path into a real event.

## Migrations

Link once per machine, then push whenever `supabase/migrations` changes:

```bash
npx supabase link --project-ref <your-project-ref>
npm run db:push      # applies every migration the remote is missing
npm run db:status    # lists local vs. remote migration versions
npm run db:new <name>  # scaffolds a new timestamped migration
```

`CONNECTION_URL` must be the **session pooler** string from Dashboard → Project Settings → Database, not the `db.<ref>.supabase.co` direct string. The direct host is IPv6-only and is unreachable from most home and office networks.

## Troubleshooting: HTTP 431

`431 Request Header Fields Too Large` means the browser sent a request whose
headers exceed Node's `--max-http-header-size`, which defaults to **16384 bytes**.
Node's HTTP parser rejects it before Next.js, the proxy, or any route handler
runs, so this cannot be caught or handled in application code.

In this app the header is almost always the **cookie jar**, and the usual cause is
accumulation rather than one oversized cookie:

- Supabase stores the session as `sb-<project-ref>-auth-token`, split into
  numbered chunks (`.0`, `.1`, …) once it exceeds ~3.2KB. One session is
  typically 4–6KB.
- **Cookies ignore the port.** Everything served from `localhost` shares one jar,
  so every Supabase project you have ever signed into on `localhost` — on any
  port, from any other repo — sends its chunks to this app too. Three stale
  sessions is enough to cross 16KB.

**Clear it:** in DevTools → Application → Cookies → `http://localhost:3000`,
delete everything (or run `document.cookie.split(";").forEach(c =>
document.cookie = c.split("=")[0].trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/")`
in the console, then sign in again).

**See what is actually there**, sorted largest first:

```js
Object.entries(
  Object.fromEntries(
    document.cookie.split("; ").map((c) => {
      const i = c.indexOf("=");
      return [c.slice(0, i), c.length];
    }),
  ),
)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(v, k));
```

`npm run dev` and `npm run start` raise the limit to 32768 bytes, which buys
headroom locally. **That is a local convenience, not a fix.** Hosts enforce their
own ceilings — Vercel and Cloudflare around 16KB, nginx 8KB by default — so a
cookie jar that genuinely needs more than 16KB will still fail in production.
If you hit this for real rather than from stale local sessions, shrink what is
stored: keep `user_metadata` small, and serve each project from its own hostname
(for example `hackberk.localhost`) so the jars never mix.

Note that both scripts set `NODE_OPTIONS` with POSIX shell syntax; on Windows
`cmd` you would need `cross-env` or to set the variable separately.

## Verification

```bash
npm run verify      # format check, lint, typecheck, unit tests, production build
npm run test:e2e    # Playwright, including axe accessibility checks
```

`npm run format` applies Prettier to `app`, `components`, `lib` and `tests`.
The stylesheets in `app/styles/` are deliberately excluded (see
`.prettierignore`): they are authored as one dense, sectioned system and are read
that way. The house style that replaces Prettier there is written at the top of
`app/globals.css`, and its first rule — never more than one CSS rule per line —
is the one that matters.

Individual steps:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Database tests require Docker. The pgTAP suite covers status transitions, one-organizer blind-review claims, team capacity, organizer access, blind-answer filtering, judge project scope, and cross-user RLS denial:

```bash
npm run db:reset && npm run db:test
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for security and interface
boundaries and organizer bootstrap instructions. `PRODUCT.md` records product
truth and [DESIGN.md](DESIGN.md) records the interface system — the palette, the
component layer, the motion rule and the voice rules, each with the failure that
produced it.

## Where things live

```
app/(app)/            every signed-in route, inside one persistent shell
  (portal)/           applications, event day, teams, projects, judging, profile
  (organizer)/        the application queue, review, event operations
app/(site)/           every signed-out route, inside the same rail
  (public)/           sign-in, sign-up, password reset, legal
app/styles/           tokens, base, components, shell, per-surface, motion, breakpoints
components/ui/        Button, ButtonLink, Dialog, SheetHeader, Eyebrow,
                      MessageSheet, StatusStamp, RoleIcon, Wordmark
lib/auth/guards.ts    who may see what, including getAcceptedRoles
lib/data/             one read model per surface, server-only
supabase/migrations/  the schema, its policies and its triggers
```

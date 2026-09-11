import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * The About page.
 *
 * This route sits outside the `(public)` group on purpose. `(public)` wraps its
 * children in `AuthShell`, which centres a narrow 520px credential sheet — the
 * right frame for a sign-in form and the wrong one for a page you actually read.
 * Living at `app/about/page.tsx` means this page inherits only the root layout
 * and can lay out its own wide reading sheet.
 *
 * Mode is Read: the visitor's success here is understanding what the portal is,
 * how it works, and how it was built. Structure comes first, then the reading
 * experience.
 */

export const metadata: Metadata = {
  title: "About",
  description: "How the Backathons at Herkeley portal works, how it was built, and the interface system behind it.",
};

/** The product workflows, in the order a real participant meets them. */
const workflows = [
  {
    name: "One account, four applications",
    detail:
      "A single verified identity carries separate hacker, judge, mentor, and volunteer applications. Each is versioned and saved as a draft until you submit it, so the four never collapse into one form.",
  },
  {
    name: "Blind organizer review",
    detail:
      "Every submitted application receives one accountable organizer blind review. The review packet is assembled server-side, so the applicant's name, school, and demographic answers are never sent to the review browser in the first place.",
  },
  {
    name: "Explicit decisions",
    detail:
      "One organizer blind review resolves into one recorded decision with a rubric trail. Nothing is accepted or rejected implicitly, and every decision retains its accountable organizer review.",
  },
  {
    name: "Team Match",
    detail:
      "Opt-in only. Accepted hackers publish skills, interests, availability, and goals; the ranking is deterministic and every suggested match shows the reasons and weights that produced its score. Teams are capped at four.",
  },
  {
    name: "Project Lens",
    detail:
      "Judges browse a team's public GitHub repository — README, file tree, syntax-highlighted source — inside a bounded read-only viewer. Submitted code is never executed, and only public repositories are accepted.",
  },
  {
    name: "Role Ops",
    detail:
      "During the event, deadlines, judging assignments, mentor requests, and volunteer shifts share one action-feed language, filtered to the roles you actually hold.",
  },
];

/** The stack, with the reason each piece is here rather than a bare list of logos. */
const stack = [
  {
    layer: "Framework",
    tech: "Next.js 16 · App Router",
    why: "Server Components render the portal with the viewer's session already applied, and Server Actions handle every mutation, so no application data passes through a client-side API layer.",
  },
  {
    layer: "Runtime",
    tech: "React 19",
    why: "`useActionState` drives the form pending and error states, and View Transitions carry sheet identity across role switches.",
  },
  {
    layer: "Database",
    tech: "Supabase Postgres",
    why: "A multi-event schema applied through versioned SQL migrations. Nothing about the schema lives only in the application code.",
  },
  {
    layer: "Authorization",
    tech: "Row Level Security",
    why: "Access is enforced in Postgres, not in the interface. A user reading the database directly with their own token sees exactly what the UI shows them, and no more.",
  },
  {
    layer: "Validation",
    tech: "Zod",
    why: "One schema per form, evaluated on the server. The browser gets fast feedback; the server keeps the authority.",
  },
  {
    layer: "Interface",
    tech: "Tailwind 4 + authored CSS",
    why: "Tailwind carries the tokens; the binder's sheets, tabs, stamps, and dockets are hand-authored CSS because they are a material system, not utility combinations.",
  },
  {
    layer: "Tests",
    tech: "Vitest · Playwright · pgTAP",
    why: "Unit tests for the domain rules, end-to-end tests with axe for the rendered surfaces, and pgTAP against the database to prove the RLS policies deny what they claim to deny.",
  },
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <header className="about-mast">
        <Wordmark href="/" />
        <nav aria-label="Site">
          <Link href="/">Home</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link className="primary-button" href="/sign-up">
            Apply now
          </Link>
        </nav>
      </header>

      <article className="about-sheet">
        <p className="about-docket">ABOUT THIS BUILD · SAMPLE DATA</p>
        <h1>A demonstration portal, built the way a real one would be.</h1>
        <p className="about-lede">
          Backathons at Herkeley is a fictional organization. The event, the applicants, the reviews, the teams, and the
          projects are all invented — this page is that disclosure, and the database marks the seeded event as sample
          data. What is not fictional is the engineering: this is a complete multi-role application portal with real
          authentication, database-enforced authorization, and a tested workflow from application through judging.
        </p>
        <p className="about-lede">
          The name is a deliberate near-miss. It exists so this portal can never be mistaken for the real organization
          whose problem shape inspired it.
        </p>

        <section aria-labelledby="about-how">
          <h2 id="about-how">How the portal works</h2>
          <ol className="about-steps">
            {workflows.map((workflow, index) => (
              <li key={workflow.name}>
                <span aria-hidden>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{workflow.name}</strong>
                  <p>{workflow.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="about-built">
          <h2 id="about-built">How it is built</h2>
          <dl className="about-stack">
            {stack.map((row) => (
              <div key={row.layer}>
                <dt>
                  <small>{row.layer}</small>
                  <strong>{row.tech}</strong>
                </dt>
                <dd>{row.why}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="about-trust">
          <h2 id="about-trust">Where the trust lives</h2>
          <p>
            The interesting constraint in a portal like this is not drawing the screens — it is making sure an applicant
            cannot read another applicant&rsquo;s answers, a judge cannot see a project they were not assigned, and an
            organizer&rsquo;s blind review packet genuinely withholds identity. Hiding those things in the interface is
            not a security boundary.
          </p>
          <p>
            So authorization is enforced in Postgres with Row Level Security, and the database tests assert the denials
            directly rather than through the UI. Service credentials stay server-only; the browser gets a publishable
            key whose reach is bounded by the same policies. The interface is a convenience over that boundary, never
            the boundary itself.
          </p>
        </section>

        <section aria-labelledby="about-interface">
          <h2 id="about-interface">The interface system</h2>
          <p>
            The visual world is an event-operations binder. Organizers running a hackathon work from a stack of paper —
            role tabs, checklists, stamped statuses, a docket strip along the bottom — and the portal renders that
            literally rather than reaching for the default floating-card dashboard.
          </p>
          <ul className="about-notes">
            <li>
              <strong>Structure.</strong> A navy control rail frames cool paper sheets. One sheet is active and
              dominant; the other roles stay visibly queued behind it, so you never lose track of the responsibilities
              you are not currently looking at.
            </li>
            <li>
              <strong>Color.</strong> Working blue marks the active responsibility and the primary action; ink navy
              supplies the frame. Ddoski gold and brown carry warmth, and coral is rationed to alerts and the volunteer
              role. No status is communicated by color alone — it is always written or shaped as well.
            </li>
            <li>
              <strong>Type.</strong> Space Grotesk commands, Karla explains, Space Mono keeps the dockets and stamps
              accountable, and Encode Sans Semi Condensed carries the active sheet&rsquo;s headline where a narrower
              silhouette protects the composition.
            </li>
            <li>
              <strong>Motion.</strong> One rehearsed arrival per surface: the navy cover opens, the role tabs seat into
              their slots, the active sheet is dealt onto the desk, and the status stamp presses last. Everything after
              arrival is fast, quiet feedback. Under <code>prefers-reduced-motion</code> every travel distance collapses
              to zero while the fades and state changes remain.
            </li>
            <li>
              <strong>Accessibility.</strong> WCAG 2.2 AA is the target: full keyboard operation, a 3px high-contrast
              focus ring, semantic forms and tables, live regions for status, and a mobile layout that reorders the
              binder into a work packet rather than shrinking it.
            </li>
          </ul>
        </section>

        <section aria-labelledby="about-next">
          <h2 id="about-next">See it working</h2>
          <p>
            Create an account to walk the applicant path end to end. Your account opens immediately, and the portal
            seeds a sample event so there is something to apply to.
          </p>
          <div className="about-actions">
            <Link className="primary-button" href="/sign-up">
              Start an application
            </Link>
            <Link className="landing-secondary" href="/sign-in">
              Sign in <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </article>

      <footer className="about-footer">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </main>
  );
}

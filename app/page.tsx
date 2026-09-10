import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * The public landing page.
 *
 * Mode is Persuade: the visitor's success is deciding to apply. Two real
 * destinations only — start an application, or sign in — so nothing here is a
 * placeholder or a preview.
 *
 * The navy panel down the left is `.landing::before` rather than a background
 * gradient, so it can be a real element that wipes open on arrival. It is hidden
 * below 950px, where the layout goes single-column.
 */
export default function HomePage() {
  return (
    <main className="landing">
      <nav><Wordmark href={null} /><div><Link href="/about">About</Link><Link className="landing-signin" href="/sign-in">Sign in</Link><Link className="primary-button" href="/sign-up">Apply now</Link></div></nav>
      <section><p className="landing-docket">APPLICATIONS · TEAMS · EVENT OPS</p><h1>Welcome to Herkeley’s Backathon!</h1><p>Apply in four roles, find your team, and keep every event-day handoff moving.</p><div><Link className="primary-button" href="/sign-up">Start an application</Link><Link className="landing-secondary" href="/sign-in">Sign in to your runbook <span aria-hidden>→</span></Link></div></section>
      <footer><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><span>Herkeley Build 2027 is synthetic demonstration data.</span></footer>
    </main>
  );
}

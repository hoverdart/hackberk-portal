import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

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
    <main className="landing landing-stage">
      <nav>
        <div>
          <Link href="/about">About</Link>
          <Link className="landing-signin" href="/sign-in">
            Sign in
          </Link>
          <ButtonLink variant="primary" size="sm" href="/sign-up">
            Apply now
          </ButtonLink>
        </div>
      </nav>
      <section>
        <h1>Build something at Herkeley.</h1>
        <p>Apply as a hacker, judge, mentor or volunteer. Find a team. See what needs you on the day.</p>
        <div>
          <ButtonLink variant="primary" href="/sign-up">
            Start an application
          </ButtonLink>
          <ButtonLink variant="ghost" href="/sign-in" trailing={<span aria-hidden>→</span>}>
            Sign in instead
          </ButtonLink>
        </div>
      </section>
      <footer>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </main>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <nav><span className="brand-lockup"><strong>Berkeley</strong><span>Hackathons</span><em>@ Berkeley</em></span><div><Link href="/sign-in">Sign in</Link><Link className="primary-button" href="/sign-up">Apply now</Link></div></nav>
      <section><p className="landing-docket">APPLICATIONS · TEAMS · EVENT OPS</p><h1>Your whole hackathon, in one runbook.</h1><p>Apply in four roles, review fairly, find your team, and keep every event-day handoff moving.</p><div><Link className="primary-button" href="/sign-up">Start an application</Link><Link href="/design/hero">Preview the Run of Show</Link></div></section>
      <footer><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><span>Berkeley Build 2027 is synthetic demonstration data.</span></footer>
    </main>
  );
}

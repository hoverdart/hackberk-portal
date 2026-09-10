import Link from "next/link";

/**
 * The wordmark.
 *
 * "Backathons" over a gold "at Herkeley". The name is a deliberate near-miss of a
 * real organization's, so this portal cannot be mistaken for it — see `/about`.
 *
 * It lives in one component because it appears on the landing page, the auth
 * rail, the portal rail and the about mast, and four hand-written copies had
 * already drifted into two different spellings. Change the name here and every
 * surface follows.
 *
 * `href` is the destination the mark links to, which differs by context: signed
 * out it goes home, signed in it goes to the dashboard. Pass `href={null}` for
 * the one case where the mark is already inside the page it would link to.
 */
export function Wordmark({ href = "/" }: { href?: string | null }) {
  const content = (
    <>
      <span>Backathons</span>
      <em>at Herkeley</em>
    </>
  );

  if (href === null) {
    return <span className="brand-lockup">{content}</span>;
  }

  return (
    <Link href={href} className="brand-lockup" aria-label="Backathons at Herkeley home">
      {content}
    </Link>
  );
}

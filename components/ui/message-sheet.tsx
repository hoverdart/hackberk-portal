import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The single-message surface: empty states, dead ends and "not for you" pages.
 *
 * Every route needs one of these and they used to be written by hand, each as a
 * bare stack of `p`/`h1`/`span` styled by position. That made them fragile —
 * reordering two elements restyled the page — and it meant ten near-identical
 * screens drifted apart. One component, one sheet, one set of class names.
 *
 * `action` is the thing to do about it; `back` is the way out. Both optional,
 * because some of these states have neither.
 */
export function MessageSheet({
  docket,
  title,
  body,
  action,
  back,
  children,
}: {
  docket: string;
  title: string;
  body?: ReactNode;
  action?: { href: string; label: string };
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <main className="start-application">
      <article className="start-sheet">
        <p className="start-sheet__docket">{docket}</p>
        <h1>{title}</h1>
        {body ? <p className="start-sheet__lede">{body}</p> : null}
        {children}
        {action ? (
          <p className="start-sheet__action">
            <Link className="primary-button" href={action.href}>
              {action.label}
            </Link>
          </p>
        ) : null}
        {back ? (
          <Link className="start-sheet__back" href={back.href}>
            {back.label}
          </Link>
        ) : null}
      </article>
    </main>
  );
}

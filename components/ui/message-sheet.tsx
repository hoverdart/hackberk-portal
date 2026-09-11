import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

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
  eyebrow,
  title,
  body,
  action,
  back,
  children,
}: {
  /** Only when it says something the title does not. Most did not. */
  eyebrow?: string;
  title: string;
  body?: ReactNode;
  action?: { href: string; label: string };
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <main className="start-application">
      <article className="start-sheet">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1>{title}</h1>
        {body ? <p className="start-sheet__lede">{body}</p> : null}
        {children}
        {action ? (
          <p className="start-sheet__action">
            <ButtonLink variant="primary" href={action.href}>
              {action.label}
            </ButtonLink>
          </p>
        ) : null}
        {back ? (
          <ButtonLink variant="ghost" href={back.href}>
            {back.label}
          </ButtonLink>
        ) : null}
      </article>
    </main>
  );
}

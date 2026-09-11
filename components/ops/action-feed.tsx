import { ArrowUpRight, Check, Clock3, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { SheetHeader } from "@/components/ui/sheet-header";

export type ActionFeedItem = {
  id: string;
  title: string;
  detail: string;
  meta?: string;
  href?: string;
  /** Make the whole row a link, for feeds where the body is the destination. */
  wrap?: { href: string; ariaLabel: string };
  action?: ReactNode;
  icon?: LucideIcon;
  done?: boolean;
};

/**
 * A list of things that need doing.
 *
 * One component renders every queue in the product — deadlines, judging,
 * mentor requests, shifts, submitted projects, the audit trail — so each of them
 * reads the same way: a marker, a title, a detail, and at most one action.
 *
 * The organizer operations page used to hand-reimplement this markup three
 * separate times, which is three chances for the same list to drift into three
 * different lists. The props that closed that gap (`icon`, `items[].icon`,
 * `emptyTitle`, `items[].wrap`) are all defaulted, so nothing else had to change.
 *
 * `empty` is required rather than optional: an empty queue is a normal state
 * during an event and deserves a written explanation, not a blank panel.
 */
export function ActionFeed({
  title,
  label,
  icon,
  items,
  empty,
  emptyTitle = "All clear.",
}: {
  title: string;
  label?: string;
  icon?: LucideIcon;
  items: ActionFeedItem[];
  empty: string;
  emptyTitle?: string;
}) {
  return (
    <section className="action-feed">
      <SheetHeader eyebrow={label} icon={icon} title={title} />
      {items.length ? (
        <ol>
          {items.map((item) => {
            const Marker = item.icon ?? (item.done ? Check : Clock3);
            const body = (
              <>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                {item.meta ? <small>{item.meta}</small> : null}
              </>
            );
            return (
              <li key={item.id} className={item.done ? "is-done" : undefined}>
                <span className="feed-marker">
                  <Marker aria-hidden />
                </span>
                {item.wrap ? (
                  <Link className="audit-entry" href={item.wrap.href} aria-label={item.wrap.ariaLabel}>
                    {body}
                  </Link>
                ) : (
                  <div>{body}</div>
                )}
                {item.href ? (
                  <Link href={item.href}>
                    Open <ArrowUpRight aria-hidden />
                  </Link>
                ) : (
                  item.action
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="empty-state">
          <strong>{emptyTitle}</strong>
          <span>{empty}</span>
        </div>
      )}
    </section>
  );
}

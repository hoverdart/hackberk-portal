import { ArrowUpRight, Check, Clock3 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type ActionFeedItem = { id: string; title: string; detail: string; meta?: string; href?: string; action?: ReactNode; done?: boolean };

/**
 * The shared Role Ops feed.
 *
 * One component renders the deadline, judging, mentor and shift queues so that
 * every role reads the same visual language — a marker, a title, a detail, and at
 * most one action. `empty` is required rather than optional: an empty queue is a
 * normal state during an event and deserves a written explanation, not a blank
 * panel.
 */
export function ActionFeed({ title, label, items, empty }: { title: string; label: string; items: ActionFeedItem[]; empty: string }) {
  return <section className="action-feed"><header><p>{label}</p><h2>{title}</h2></header>{items.length ? <ol>{items.map((item) => <li key={item.id} className={item.done ? "is-done" : undefined}><span className="feed-marker">{item.done ? <Check aria-hidden /> : <Clock3 aria-hidden />}</span><div><strong>{item.title}</strong><p>{item.detail}</p>{item.meta ? <small>{item.meta}</small> : null}</div>{item.href ? <Link href={item.href}>Open <ArrowUpRight aria-hidden /></Link> : item.action}</li>)}</ol> : <div className="empty-state"><strong>All clear.</strong><span>{empty}</span></div>}</section>;
}

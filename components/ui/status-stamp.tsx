import { statusLabel, type ApplicationSummary } from "@/lib/domain/applications";

/**
 * The rubber-stamp status marker.
 *
 * Always renders the status as words as well as colour. Colour alone would fail
 * WCAG 1.4.1 and would be unreadable for anyone who cannot distinguish the
 * palette's green from its red; the rotation and border come from CSS.
 */
export function StatusStamp({ status }: { status: ApplicationSummary["status"] }) {
  return <span className={`status-stamp status-stamp--${status}`}>{statusLabel(status)}</span>;
}

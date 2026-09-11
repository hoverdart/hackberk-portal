/**
 * The vocabulary of the application system.
 *
 * These four roles and seven statuses are the spine of the whole product: the
 * database enums in `supabase/migrations` use the same strings, so a value that
 * type-checks here is a value Postgres will accept. If you add a role or a
 * status, the migration and this file have to change together.
 */

export const applicationRoles = ["hacker", "judge", "mentor", "volunteer"] as const;
export type ApplicationRole = (typeof applicationRoles)[number];

/**
 * The application lifecycle, in the order an application normally travels:
 * `draft` while the applicant is filling it in, `submitted` once they commit,
 * `under_review` while organizers read it, then one terminal decision. The
 * database enforces which transitions are legal — see the status-transition
 * trigger in the migrations and the pgTAP tests that cover it.
 */
export const applicationStatuses = [
  "draft",
  "submitted",
  "under_review",
  "accepted",
  "waitlisted",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

/**
 * One wizard section, reduced to what the dashboard checklist may know about it.
 *
 * Deliberately just a title and a boolean. The dashboard shows whether a section
 * is finished, never what was answered, so this type is the shape that enforces
 * the promise: there is nowhere here to put an answer even by accident.
 */
export type SectionProgress = { key: string; title: string; complete: boolean };

/**
 * What the interface needs to render one role's card.
 *
 * `id` is null and `status` is `"not_started"` when no row exists yet — the
 * applicant has simply never opened that role's form. That is a UI state rather
 * than a database state, which is why `"not_started"` is not in the enum above.
 *
 * `progress` is derived from `sections` rather than stored, so the seal on the
 * dashboard and the ticks in the checklist cannot disagree.
 */
export type ApplicationSummary = {
  id: string | null;
  role: ApplicationRole;
  status: ApplicationStatus | "not_started";
  progress: number;
  sections: SectionProgress[];
};

/**
 * The three-word purpose printed on each role tab. Kept here rather than in the
 * shell so the tabs and anything else naming a role cannot drift apart.
 */
export const roleCopy: Record<ApplicationRole, { words: [string, string, string] }> = {
  hacker: { words: ["BUILD", "LEARN", "COLLABORATE"] },
  judge: { words: ["EVALUATE", "SUPPORT", "GIVE BACK"] },
  mentor: { words: ["SHARE", "GUIDE", "EMPOWER"] },
  volunteer: { words: ["MAKE", "IT HAPPEN", "TOGETHER"] },
};

/** Turn a stored status into display text: `under_review` becomes "Under review". */
export function statusLabel(status: ApplicationSummary["status"]) {
  return status === "not_started"
    ? "Not started"
    : status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

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
export const applicationStatuses = ["draft", "submitted", "under_review", "accepted", "waitlisted", "rejected", "withdrawn"] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

/**
 * What the interface needs to render one role's card.
 *
 * `id` is null and `status` is `"not_started"` when no row exists yet — the
 * applicant has simply never opened that role's form. That is a UI state rather
 * than a database state, which is why `"not_started"` is not in the enum above.
 */
export type ApplicationSummary = { id: string | null; role: ApplicationRole; status: ApplicationStatus | "not_started"; progress: number };

/**
 * Role-specific copy. `words` are the three-word purpose printed on each role
 * tab; `tagline` is the one-line promise shown on a queued sheet. Kept here so
 * the shell, the tabs, and the queued sheets cannot drift apart.
 */
export const roleCopy: Record<ApplicationRole, { words: [string, string, string]; tagline: string }> = {
  hacker: { words: ["BUILD", "LEARN", "COLLABORATE"], tagline: "Make an idea real." },
  judge: { words: ["EVALUATE", "SUPPORT", "GIVE BACK"], tagline: "Help spot great ideas." },
  mentor: { words: ["SHARE", "GUIDE", "EMPOWER"], tagline: "Guide builders forward." },
  volunteer: { words: ["MAKE", "IT HAPPEN", "TOGETHER"], tagline: "Power the experience." },
};

/** Turn a stored status into display text: `under_review` becomes "Under review". */
export function statusLabel(status: ApplicationSummary["status"]) {
  return status === "not_started" ? "Not started" : status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

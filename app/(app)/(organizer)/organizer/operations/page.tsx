import { CalendarClock, ClipboardCheck, GitFork, LifeBuoy } from "lucide-react";

import {
  assignProjectJudgeAction,
  createVolunteerShiftAction,
  resolveMentorRequestAction,
} from "@/app/(app)/(organizer)/organizer/operations/actions";
import { ActionFeed, type ActionFeedItem } from "@/components/ops/action-feed";
import { requireOrganizer } from "@/lib/auth/guards";
import { getOrganizerOperations } from "@/lib/data/organizer-ops";
import { Button } from "@/components/ui/button";
import { MessageSheet } from "@/components/ui/message-sheet";
import { SheetHeader } from "@/components/ui/sheet-header";
import { formatEventDateTime, formatShiftRange } from "@/lib/formatters/event-time";

/**
 * Event operations: assign judges, clear mentor requests, run shifts, read the
 * decision history.
 *
 * Assigning a judge to a project is what grants that judge access to it, so this
 * page issues authorization rather than merely scheduling.
 *
 * Every panel here is an `ActionFeed`. Three of them used to be hand-written
 * copies of that component's markup sitting a few hundred lines from the real
 * thing.
 */
export default async function OrganizerOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const organizer = await requireOrganizer();
  const data = await getOrganizerOperations(organizer.eventId);
  const query = await searchParams;
  if (!data.event)
    return (
      <MessageSheet
        title="Event operations are unavailable."
        back={{ href: "/organizer/applications", label: "Back to applications" }}
      />
    );
  const event = data.event;

  const projectItems: ActionFeedItem[] = data.projects.map((project) => {
    const team = project.teams as unknown as { name: string };
    const assignments = project.project_review_assignments as unknown as Array<{ id: string; judge_id: string }>;
    const available = data.judges.filter(
      (judge) => !assignments.some((assignment) => assignment.judge_id === judge.applicant_id),
    );
    return {
      id: project.id,
      icon: ClipboardCheck,
      title: project.name,
      detail: `${team?.name ?? "Team"} · ${assignments.length} judge${assignments.length === 1 ? "" : "s"} assigned`,
      done: assignments.length > 0,
      action: project.submitted_at ? (
        <form action={assignProjectJudgeAction.bind(null, project.id)}>
          <label className="sr-only" htmlFor={`judge-${project.id}`}>
            Assign a judge to {project.name}
          </label>
          <select id={`judge-${project.id}`} name="judgeId" required defaultValue="">
            <option value="" disabled>
              Choose a judge
            </option>
            {available.map((judge) => {
              const profile = judge.profiles as unknown as { full_name: string; preferred_name: string | null };
              return (
                <option key={judge.applicant_id} value={judge.applicant_id}>
                  {profile?.preferred_name || profile?.full_name || "Accepted judge"}
                </option>
              );
            })}
          </select>
          <Button size="sm" type="submit">
            Assign
          </Button>
        </form>
      ) : (
        <small>Not submitted yet</small>
      ),
    };
  });

  const mentorItems: ActionFeedItem[] = data.mentorRequests.map((request) => ({
    id: request.id,
    icon: LifeBuoy,
    title: request.title,
    detail: request.expertise_tags.join(" · ") || "General help",
    meta: request.status === "claimed" ? "A mentor is on it" : undefined,
    done: request.status === "resolved",
    action:
      request.status !== "resolved" ? (
        <form action={resolveMentorRequestAction.bind(null, request.id)}>
          <Button size="sm" type="submit">
            Mark resolved
          </Button>
        </form>
      ) : undefined,
  }));

  const auditItems: ActionFeedItem[] = data.audit.map((entry) => {
    const resultingStatus = readStatus(entry.after_state);
    return {
      id: String(entry.id),
      icon: ClipboardCheck,
      title: entry.application
        ? `${entry.application.applicantName}’s ${entry.application.role} application`
        : `${entry.entity_type} · ${entry.entity_id.slice(0, 8)}`,
      detail: entry.application
        ? `Status changed${resultingStatus ? ` to ${resultingStatus}` : ""}`
        : entry.action.replaceAll("_", " "),
      meta: formatEventDateTime(entry.created_at, event.timezone),
      done: true,
      wrap: entry.application
        ? {
            href: `/organizer/applications/${entry.application.id}/review`,
            ariaLabel: `Open ${entry.application.applicantName}’s ${entry.application.role} application`,
          }
        : undefined,
    };
  });

  return (
    <main className="organizer-page">
      <header className="organizer-mast">
        <div>
          <h1>Event operations</h1>
          <span>
            {event.name} · {event.venue}
          </span>
        </div>
      </header>
      {query.success ? <p className="workspace-notice workspace-notice--success">Saved.</p> : null}
      {query.error ? (
        <p className="workspace-notice workspace-notice--error">
          That did not go through. Nothing was assigned or changed.
        </p>
      ) : null}
      <div className="ops-grid">
        <ActionFeed
          icon={GitFork}
          title="Projects awaiting judges"
          items={projectItems}
          emptyTitle="No projects yet."
          empty="Projects appear here once teams submit them."
        />
        <ActionFeed
          icon={LifeBuoy}
          title="Help requests"
          items={mentorItems}
          emptyTitle="Nothing open."
          empty="Hackers have not asked for help yet."
        />
        <section className="request-composer">
          <SheetHeader icon={CalendarClock} title="Volunteer shifts" />
          <form action={createVolunteerShiftAction.bind(null, event.id)}>
            <label>
              What is the shift?
              <input name="title" minLength={3} maxLength={120} required />
            </label>
            <label>
              Where
              <input name="location" minLength={2} maxLength={160} required />
            </label>
            <label>
              Starts
              <input name="startsAt" type="datetime-local" required />
            </label>
            <label>
              Ends
              <input name="endsAt" type="datetime-local" required />
            </label>
            <label>
              How many volunteers
              <input name="capacity" type="number" min="1" max="500" required />
            </label>
            <label>
              What they need to do <small>One per line, optional</small>
              <textarea name="checklist" rows={3} maxLength={1200} />
            </label>
            <Button variant="primary" type="submit">
              Add shift
            </Button>
          </form>
          <section className="shift-roster" aria-labelledby="published-shifts-title">
            <div className="shift-roster__header">
              <h3 id="published-shifts-title">Scheduled</h3>
              <span>
                {data.shifts.length} shift{data.shifts.length === 1 ? "" : "s"}
              </span>
            </div>
            {data.shifts.length ? (
              <ul>
                {data.shifts.map((shift) => {
                  const assigned = (shift.volunteer_shift_assignments as unknown as unknown[]).length;
                  return (
                    <li key={shift.id}>
                      <div>
                        <strong>{shift.title}</strong>
                        <span>{formatShiftRange(shift.starts_at, shift.ends_at, event.timezone)}</span>
                      </div>
                      <p>
                        {shift.location} · {assigned} of {shift.capacity} filled
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="shift-roster__empty">No shifts scheduled yet.</p>
            )}
          </section>
        </section>
        <ActionFeed
          icon={ClipboardCheck}
          title="Recent decisions"
          items={auditItems}
          emptyTitle="No decisions yet."
          empty="Every status change is recorded here as it happens."
        />
      </div>
    </main>
  );
}

function readStatus(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const status = (value as Record<string, unknown>).status;
  return typeof status === "string" ? status.replaceAll("_", " ") : null;
}

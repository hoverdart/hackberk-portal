import { ArrowLeft, CalendarClock, ClipboardCheck, GitFork, LifeBuoy } from "lucide-react";
import Link from "next/link";

import {
  assignProjectJudgeAction,
  createVolunteerShiftAction,
  resolveMentorRequestAction,
} from "@/app/(app)/(organizer)/organizer/operations/actions";
import { requireOrganizer } from "@/lib/auth/guards";
import { getOrganizerOperations } from "@/lib/data/organizer-ops";
import { MessageSheet } from "@/components/ui/message-sheet";
import { formatEventDateTime, formatShiftRange } from "@/lib/formatters/event-time";

/**
 * The organizer control sheet: judge assignment, mentor triage, shifts, audit.
 *
 * Assigning a judge to a project is what grants that judge access to it, so this
 * page is issuing authorization, not just scheduling.
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
        docket="ORGANIZER"
        title="Event operations are unavailable."
        back={{ href: "/organizer/applications", label: "Return to the application queue" }}
      />
    );
  const event = data.event;

  return (
    <main className="organizer-page">
      <header className="organizer-mast">
        <div>
          <Link href="/organizer/applications">
            <ArrowLeft aria-hidden />
            Application control
          </Link>
          <p>ORGANIZER · EVENT CONTROL</p>
          <h1>Operations docket</h1>
          <span>
            {event.name} · {event.venue}
          </span>
        </div>
      </header>
      {query.success ? <p className="workspace-notice workspace-notice--success">Operations docket updated.</p> : null}
      {query.error ? (
        <p className="workspace-notice workspace-notice--error">
          That operation did not finish. No assignment or capacity was changed.
        </p>
      ) : null}
      <div className="ops-grid">
        <section className="action-feed">
          <header>
            <p>PROJECT JUDGING</p>
            <h2>
              <GitFork aria-hidden /> Submitted projects
            </h2>
          </header>
          {data.projects.length ? (
            <ol>
              {data.projects.map((project) => {
                const team = project.teams as unknown as { name: string };
                const assignments = project.project_review_assignments as unknown as Array<{
                  id: string;
                  judge_id: string;
                }>;
                return (
                  <li key={project.id}>
                    <span className="feed-marker">
                      <ClipboardCheck aria-hidden />
                    </span>
                    <div>
                      <strong>{project.name}</strong>
                      <p>
                        {team?.name ?? "Team"} · {assignments.length} judge{assignments.length === 1 ? "" : "s"}{" "}
                        assigned
                      </p>
                    </div>
                    {project.submitted_at ? (
                      <form action={assignProjectJudgeAction.bind(null, project.id)}>
                        <label className="sr-only" htmlFor={`judge-${project.id}`}>
                          Assign judge to {project.name}
                        </label>
                        <select id={`judge-${project.id}`} name="judgeId" required defaultValue="">
                          <option value="" disabled>
                            Choose judge
                          </option>
                          {data.judges
                            .filter(
                              (judge) => !assignments.some((assignment) => assignment.judge_id === judge.applicant_id),
                            )
                            .map((judge) => {
                              const profile = judge.profiles as unknown as {
                                full_name: string;
                                preferred_name: string | null;
                              };
                              return (
                                <option key={judge.applicant_id} value={judge.applicant_id}>
                                  {profile?.preferred_name || profile?.full_name || "Accepted judge"}
                                </option>
                              );
                            })}
                        </select>
                        <button>Assign</button>
                      </form>
                    ) : (
                      <small>Awaiting submission</small>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="empty-state">
              <strong>No submitted projects.</strong>
              <span>Project records appear here as teams create them.</span>
            </div>
          )}
        </section>
        <section className="action-feed">
          <header>
            <p>MENTOR DESK</p>
            <h2>
              <LifeBuoy aria-hidden /> Help requests
            </h2>
          </header>
          {data.mentorRequests.length ? (
            <ol>
              {data.mentorRequests.map((request) => (
                <li key={request.id} className={request.status === "resolved" ? "is-done" : undefined}>
                  <span className="feed-marker">
                    <LifeBuoy aria-hidden />
                  </span>
                  <div>
                    <strong>{request.title}</strong>
                    <p>{request.expertise_tags.join(" · ") || "General support"}</p>
                    <small>{request.status}</small>
                  </div>
                  {request.status !== "resolved" ? (
                    <form action={resolveMentorRequestAction.bind(null, request.id)}>
                      <button>Resolve</button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-state">
              <strong>Help desk is clear.</strong>
              <span>No mentor requests have been opened.</span>
            </div>
          )}
        </section>
        <section className="request-composer">
          <p>VOLUNTEER SHIFTS</p>
          <h2>
            <CalendarClock aria-hidden /> Publish a shift
          </h2>
          <form action={createVolunteerShiftAction.bind(null, event.id)}>
            <label>
              Shift title
              <input name="title" minLength={3} maxLength={120} required />
            </label>
            <label>
              Location
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
              Capacity
              <input name="capacity" type="number" min="1" max="500" required />
            </label>
            <button className="primary-button">Publish shift</button>
          </form>
          <section className="shift-roster" aria-labelledby="published-shifts-title">
            <div className="shift-roster__header">
              <h3 id="published-shifts-title">Published shifts</h3>
              <span>{data.shifts.length} on the roster</span>
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
                        {shift.location} · {assigned}/{shift.capacity} assigned
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="shift-roster__empty">No volunteer shifts have been published yet.</p>
            )}
          </section>
        </section>
        <section className="action-feed">
          <header>
            <p>AUDIT HISTORY</p>
            <h2>
              <ClipboardCheck aria-hidden /> Recent application decisions
            </h2>
          </header>
          {data.audit.length ? (
            <ol>
              {data.audit.map((entry) => {
                const resultingStatus = readStatus(entry.after_state);
                const detail = entry.application
                  ? `Status changed${resultingStatus ? ` to ${resultingStatus}` : ""}`
                  : entry.action.replaceAll("_", " ");
                const content = (
                  <>
                    <strong>
                      {entry.application
                        ? `${entry.application.applicantName}'s ${entry.application.role} application`
                        : `${entry.entity_type} · ${entry.entity_id.slice(0, 8)}`}
                    </strong>
                    <p>{detail}</p>
                    <small>{formatEventDateTime(entry.created_at, event.timezone)}</small>
                  </>
                );
                return (
                  <li key={entry.id}>
                    <span className="feed-marker">
                      <ClipboardCheck aria-hidden />
                    </span>
                    {entry.application ? (
                      <Link
                        className="audit-entry"
                        href={`/organizer/applications/${entry.application.id}/review`}
                        aria-label={`Open ${entry.application.applicantName}'s ${entry.application.role} application`}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div>{content}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="empty-state">
              <strong>No decisions recorded.</strong>
              <span>Status changes appear here as an append-only history.</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function readStatus(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const status = (value as Record<string, unknown>).status;
  return typeof status === "string" ? status.replaceAll("_", " ") : null;
}

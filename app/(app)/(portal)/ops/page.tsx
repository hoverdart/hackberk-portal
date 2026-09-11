import { CalendarClock, CheckCircle2, LifeBuoy } from "lucide-react";

import {
  cancelMentorRequestAction,
  checkInShiftAction,
  checkOutShiftAction,
  claimMentorRequestAction,
  createMentorRequestAction,
  joinVolunteerShiftAction,
  resolveOwnMentorRequestAction,
  toggleShiftTaskAction,
} from "@/app/(app)/(portal)/ops/actions";
import { ActionFeed, type ActionFeedItem } from "@/components/ops/action-feed";
import { Button } from "@/components/ui/button";
import { MessageSheet } from "@/components/ui/message-sheet";
import { SheetHeader } from "@/components/ui/sheet-header";
import { requireApplicant } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/data/applications";
import { getOpsHub } from "@/lib/data/ops";
import { shiftDuration } from "@/lib/formatters/event-time";

/**
 * Event day: what needs this person, in the roles they actually hold.
 *
 * This page used to stack all four queues for everyone, so a hacker who had
 * never applied to mentor still got a "Help desk" panel reading "Accepted
 * mentors unlock this queue" — three quarters of the page telling most people
 * about work that was not theirs. Sections now appear only for accepted roles,
 * which is also what the rail does.
 */
export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireApplicant();
  const event = await getActiveEvent();
  if (!event)
    return (
      <MessageSheet
        title="No event is running right now."
        back={{ href: "/dashboard", label: "Back to your applications" }}
      />
    );
  const data = await getOpsHub(user.id, event.id);
  const accepted = new Set(data.applications.filter((app) => app.status === "accepted").map((app) => app.role));
  const query = await searchParams;

  // A deadline addressed to a role belongs to the people who hold that role, not
  // to anyone who once opened its form. Matching on "has an application" meant a
  // rejected judge and a half-filled volunteer draft both drew work that was
  // never theirs. A deadline with no audience is for everybody.
  const milestoneItems: ActionFeedItem[] = data.milestones
    .filter((item) => !item.audience || accepted.has(item.audience))
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.description,
      meta: formatDate(item.due_at),
      // Where the work is actually done. This used to be derived from the
      // audience, so every deadline opened an application form — "Team lock"
      // sent you to the hacker application rather than to Team Match.
      href: item.link_path ?? "/dashboard",
    }));

  const mentorItems: ActionFeedItem[] = data.mentorRequests
    .filter((request) => request.status === "open" || request.claimed_by === user.id)
    .map((request) => ({
      id: request.id,
      title: request.title,
      // The description is the actual question. It was loaded and then thrown
      // away, so a mentor had to claim a request to find out what it was.
      detail: request.description,
      meta: request.expertise_tags.join(" · ") || "General help",
      done: request.status !== "open",
      action:
        request.status === "open" ? (
          <form action={claimMentorRequestAction.bind(null, request.id)}>
            <Button size="sm" type="submit">
              I’ll take this
            </Button>
          </form>
        ) : request.status === "claimed" ? (
          <form action={resolveOwnMentorRequestAction.bind(null, request.id)}>
            <Button size="sm" type="submit" icon={<CheckCircle2 aria-hidden />}>
              Mark done
            </Button>
          </form>
        ) : undefined,
    }));

  // What the hacker who asked can see. Before this a request went in and nothing
  // ever came back: no confirmation it had been picked up, no way to withdraw
  // one that had been answered in person.
  const myRequestItems: ActionFeedItem[] = data.mentorRequests
    .filter((request) => request.requester_id === user.id && request.status !== "cancelled")
    .map((request) => ({
      id: `mine-${request.id}`,
      title: request.title,
      detail: request.description,
      meta: requestStateLabel(request.status),
      done: request.status === "resolved",
      action:
        request.status === "open" ? (
          <form action={cancelMentorRequestAction.bind(null, request.id)}>
            <Button size="sm" type="submit">
              Withdraw
            </Button>
          </form>
        ) : undefined,
    }));

  const judgingItems: ActionFeedItem[] = data.projectAssignments.map((assignment) => {
    const project = assignment.projects as unknown as { name: string; summary: string };
    return {
      id: assignment.id,
      title: project.name,
      detail: project.summary,
      meta: "Assigned to you",
      href: `/projects/${assignment.project_id}/judge`,
    };
  });

  return (
    <main className="ops-page">
      <header className="feature-mast">
        <h1>Event day</h1>
        <span>Everything waiting on you, across every role you hold.</span>
      </header>
      {query.success ? <p className="workspace-notice workspace-notice--success">Saved.</p> : null}
      {query.error ? (
        <p className="workspace-notice workspace-notice--error">That did not go through. Nothing was changed.</p>
      ) : null}
      <div className="ops-grid">
        <ActionFeed
          title="Deadlines"
          items={milestoneItems}
          emptyTitle="Nothing due."
          empty="New deadlines appear here as organizers set them."
        />

        {accepted.has("judge") ? (
          <ActionFeed
            title="Projects to judge"
            items={judgingItems}
            emptyTitle="Nothing assigned yet."
            empty="Organizers assign projects to judges once teams submit them."
          />
        ) : null}

        {accepted.has("mentor") ? (
          <section id="mentor">
            <ActionFeed
              icon={LifeBuoy}
              title="Requests for help"
              items={mentorItems}
              emptyTitle="Nothing open."
              empty="No teams are waiting for help right now."
            />
          </section>
        ) : null}

        {accepted.has("volunteer") ? (
          <section className="request-composer" id="volunteer">
            <SheetHeader icon={CalendarClock} title="Your shifts" />
            <ShiftBoard shifts={data.shifts} assignments={data.shiftAssignments} formatDate={formatDate} />
          </section>
        ) : null}

        {accepted.has("hacker") ? (
          <ActionFeed
            title="Your requests"
            items={myRequestItems}
            emptyTitle="Nothing open."
            empty="Anything you ask a mentor shows up here with its status."
          />
        ) : null}

        {accepted.has("hacker") ? (
          <section className="request-composer">
            <SheetHeader icon={LifeBuoy} title="Ask a mentor" />
            <form action={createMentorRequestAction.bind(null, event.id)}>
              <label>
                What do you need?
                <input name="title" minLength={4} maxLength={120} required />
              </label>
              <label>
                Tell them a bit more
                <textarea name="description" minLength={10} maxLength={1200} rows={4} required />
              </label>
              <fieldset>
                <legend>What kind of help?</legend>
                {["AI / ML", "Web", "Mobile", "Hardware", "Product", "Design"].map((tag) => (
                  <label key={tag}>
                    <input type="checkbox" name="expertiseTags" value={tag} />
                    {tag}
                  </label>
                ))}
              </fieldset>
              <Button variant="primary" type="submit">
                Send to a mentor
              </Button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}

/**
 * A volunteer's shifts: join, check in, work the list.
 *
 * The shift carries the tasks and each volunteer carries their own progress, so
 * a checklist reads from both. Every column here shipped in the first migration
 * and was seeded with real content; none of it had ever been rendered, so a
 * volunteer's entire experience was one "Join shift" button.
 */
function ShiftBoard({
  shifts,
  assignments,
  formatDate,
}: {
  shifts: Awaited<ReturnType<typeof getOpsHub>>["shifts"];
  assignments: Awaited<ReturnType<typeof getOpsHub>>["shiftAssignments"];
  formatDate: (value: string) => string;
}) {
  if (!shifts.length) return <p className="shift-roster__empty">No shifts have been scheduled yet.</p>;
  const minutes = assignments.reduce((total, assignment) => {
    if (!assignment.checked_in_at || !assignment.checked_out_at) return total;
    return total + Math.max(0, (Date.parse(assignment.checked_out_at) - Date.parse(assignment.checked_in_at)) / 60000);
  }, 0);
  return (
    <>
      {minutes > 0 ? (
        <p className="shift-total">
          <strong>{formatMinutes(minutes)}</strong> logged so far
        </p>
      ) : null}
      <ul className="shift-list">
        {shifts.map((shift) => {
          const mine = assignments.find((assignment) => assignment.shift_id === shift.id);
          const tasks = Array.isArray(shift.checklist) ? (shift.checklist as string[]) : [];
          const state = (mine?.checklist_state ?? {}) as Record<string, boolean>;
          return (
            <li key={shift.id} className="shift-card">
              <div className="shift-card__head">
                <div>
                  <strong>{shift.title}</strong>
                  <span>
                    {shift.location} · {formatDate(shift.starts_at)}
                  </span>
                </div>
                {!mine ? (
                  <form action={joinVolunteerShiftAction.bind(null, shift.id)}>
                    <Button size="sm" type="submit">
                      Join
                    </Button>
                  </form>
                ) : !mine.checked_in_at ? (
                  <form action={checkInShiftAction.bind(null, shift.id)}>
                    <Button variant="primary" size="sm" type="submit">
                      Check in
                    </Button>
                  </form>
                ) : mine.checked_out_at ? (
                  <span className="shift-card__state">
                    <CheckCircle2 aria-hidden /> {shiftDuration(mine.checked_in_at, mine.checked_out_at)} logged
                  </span>
                ) : (
                  <form action={checkOutShiftAction.bind(null, shift.id)}>
                    <Button size="sm" type="submit">
                      Check out
                    </Button>
                  </form>
                )}
              </div>
              {mine && tasks.length ? (
                <ul className="shift-tasks">
                  {tasks.map((task) => (
                    <li key={task}>
                      <form action={toggleShiftTaskAction.bind(null, shift.id)}>
                        <input type="hidden" name="task" value={task} />
                        <button type="submit" aria-pressed={Boolean(state[task])}>
                          <span aria-hidden>{state[task] ? "✓" : ""}</span>
                          {task}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Total volunteered time, in the same shape as a single shift's duration. */
function formatMinutes(total: number) {
  const rounded = Math.round(total);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** What a hacker should be told about a request they raised. */
function requestStateLabel(status: string) {
  if (status === "open") return "Waiting for a mentor";
  if (status === "claimed") return "A mentor is on it";
  return "Resolved";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(value));
}

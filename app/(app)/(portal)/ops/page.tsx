import { Button } from "@/components/ui/button";
import {
  claimMentorRequestAction,
  createMentorRequestAction,
  joinVolunteerShiftAction,
} from "@/app/(app)/(portal)/ops/actions";
import { ActionFeed, type ActionFeedItem } from "@/components/ops/action-feed";
import { requireApplicant } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/data/applications";
import { getOpsHub } from "@/lib/data/ops";
import { MessageSheet } from "@/components/ui/message-sheet";

/**
 * Role Ops: the event-day action feed.
 *
 * One page for every role. Sections appear based on the roles the user actually
 * holds, and each renders the shared `ActionFeed` so a judge, mentor and
 * volunteer all read the same visual language.
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
        title="No active event is available."
        back={{ href: "/dashboard", label: "Return to the dashboard" }}
      />
    );
  const data = await getOpsHub(user.id, event.id);
  const acceptedRoles = new Set(data.applications.filter((app) => app.status === "accepted").map((app) => app.role));
  const query = await searchParams;
  const milestoneItems: ActionFeedItem[] = data.milestones
    .filter((item) => !item.audience || data.applications.some((app) => app.role === item.audience))
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.description,
      meta: formatDate(item.due_at),
      href: item.audience ? `/applications/${item.audience}` : "/dashboard",
    }));
  const judgingItems: ActionFeedItem[] = data.projectAssignments.map((assignment) => {
    const project = assignment.projects as unknown as { name: string; summary: string };
    return {
      id: assignment.id,
      title: project.name,
      detail: project.summary,
      meta: "Assigned project",
      href: `/projects/${assignment.project_id}/judge`,
    };
  });
  const mentorItems: ActionFeedItem[] = acceptedRoles.has("mentor")
    ? data.mentorRequests
        .filter((request) => request.status === "open" || request.claimed_by === user.id)
        .map((request) => ({
          id: request.id,
          title: request.title,
          detail: request.description,
          meta: request.expertise_tags.join(" · "),
          done: request.status !== "open",
          action:
            request.status === "open" ? (
              <form action={claimMentorRequestAction.bind(null, request.id)}>
                <button>Claim request</button>
              </form>
            ) : undefined,
        }))
    : [];
  const shiftItems: ActionFeedItem[] = acceptedRoles.has("volunteer")
    ? data.shifts.map((shift) => {
        const assigned = data.shiftAssignments.some((assignment) => assignment.shift_id === shift.id);
        return {
          id: shift.id,
          title: shift.title,
          detail: shift.location,
          meta: `${formatDate(shift.starts_at)} · ${shift.capacity} seats`,
          done: assigned,
          action: assigned ? undefined : (
            <form action={joinVolunteerShiftAction.bind(null, shift.id)}>
              <button>Join shift</button>
            </form>
          ),
        };
      })
    : [];
  return (
    <main className="ops-page" id="support">
      <header className="feature-mast">
        <h1>Event day</h1>
        <span>Everything waiting on you, across every role you hold.</span>
      </header>
      {query.success ? <p className="workspace-notice workspace-notice--success">Saved.</p> : null}
      {query.error ? (
        <p className="workspace-notice workspace-notice--error">
          That did not go through. Nothing was claimed or joined.
        </p>
      ) : null}
      <div className="ops-grid">
        <ActionFeed title="Deadlines" items={milestoneItems} empty="No upcoming deadlines." />
        <ActionFeed title="Projects to judge" items={judgingItems} empty="Nothing has been assigned to you yet." />
        <ActionFeed title="Requests for help" items={mentorItems} empty="No teams are waiting for help right now." />
        <ActionFeed title="Volunteer shifts" items={shiftItems} empty="No shifts have been scheduled yet." />
        {acceptedRoles.has("hacker") ? (
          <section className="request-composer">
            <h2>Ask a mentor</h2>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(value));
}

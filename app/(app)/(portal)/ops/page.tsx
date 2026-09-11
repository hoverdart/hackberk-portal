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
        docket="ROLE OPS"
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
        <p>ROLE OPS · LIVE HANDOFFS</p>
        <h1>What needs you next?</h1>
        <span>One action-feed language, tuned to every role you hold.</span>
      </header>
      {query.success ? <p className="workspace-notice workspace-notice--success">Role Ops updated.</p> : null}
      {query.error ? (
        <p className="workspace-notice workspace-notice--error">
          That operation did not finish. Capacity and ownership are unchanged.
        </p>
      ) : null}
      <div className="ops-grid">
        <ActionFeed
          label="ALL ROLES"
          title="Deadlines & milestones"
          items={milestoneItems}
          empty="No upcoming deadlines."
        />
        <ActionFeed
          label="JUDGE"
          title="Project judging queue"
          items={judgingItems}
          empty="No submitted projects are assigned to you."
        />
        <ActionFeed
          label="MENTOR"
          title="Help desk"
          items={mentorItems}
          empty={acceptedRoles.has("mentor") ? "No teams are waiting for help." : "Accepted mentors unlock this queue."}
        />
        <ActionFeed
          label="VOLUNTEER"
          title="Shift board"
          items={shiftItems}
          empty={acceptedRoles.has("volunteer") ? "No shifts are published." : "Accepted volunteers unlock shifts."}
        />
        {acceptedRoles.has("hacker") ? (
          <section className="request-composer">
            <p>HACKER · HELP DESK</p>
            <h2>Ask a mentor</h2>
            <form action={createMentorRequestAction.bind(null, event.id)}>
              <label>
                Short title
                <input name="title" minLength={4} maxLength={120} required />
              </label>
              <label>
                What are you stuck on?
                <textarea name="description" minLength={10} maxLength={1200} rows={4} required />
              </label>
              <fieldset>
                <legend>Expertise needed</legend>
                {["AI / ML", "Web", "Mobile", "Hardware", "Product", "Design"].map((tag) => (
                  <label key={tag}>
                    <input type="checkbox" name="expertiseTags" value={tag} />
                    {tag}
                  </label>
                ))}
              </fieldset>
              <button className="primary-button">Send to mentor desk</button>
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

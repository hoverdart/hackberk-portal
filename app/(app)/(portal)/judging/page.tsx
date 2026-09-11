import { Scale } from "lucide-react";

import { ActionFeed, type ActionFeedItem } from "@/components/ops/action-feed";
import { MessageSheet } from "@/components/ui/message-sheet";
import { getAcceptedRoles, requireApplicant } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/data/applications";
import { getJudgingQueue } from "@/lib/data/judging";

/**
 * A judge's own queue.
 *
 * Judging used to be one panel among four on the shared event-day page, and it
 * was the only surface a judge had — an accepted judge otherwise saw the same
 * hacker dashboard as everyone else. It gets its own destination now, and it
 * tells a judge the thing the old panel could not: which of their projects
 * still need a score.
 *
 * Authorization is the assignment itself. `project_review_assignments` is what
 * grants a judge read access to a project, so this query returns nothing at all
 * for anyone who has not been assigned.
 */
export default async function JudgingPage() {
  const user = await requireApplicant();
  const roles = await getAcceptedRoles();
  if (!roles.has("judge"))
    return (
      <MessageSheet
        title="Judging opens once your judge application is accepted."
        body="You will see the projects assigned to you here."
        back={{ href: "/dashboard", label: "Back to your applications" }}
      />
    );
  const event = await getActiveEvent();
  if (!event)
    return (
      <MessageSheet
        title="No event is running right now."
        back={{ href: "/dashboard", label: "Back to your applications" }}
      />
    );

  const assignments = await getJudgingQueue(user.id);
  const toScore: ActionFeedItem[] = assignments
    .filter((assignment) => !assignment.scored)
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.projectName,
      detail: assignment.summary,
      meta: assignment.teamName,
      href: `/projects/${assignment.projectId}/judge`,
    }));
  const scored: ActionFeedItem[] = assignments
    .filter((assignment) => assignment.scored)
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.projectName,
      detail: assignment.summary,
      meta: assignment.teamName,
      done: true,
      href: `/projects/${assignment.projectId}/judge`,
    }));

  return (
    <main className="feature-page">
      <header className="feature-mast">
        <h1>Judging</h1>
        <span>
          {toScore.length
            ? `${toScore.length} ${toScore.length === 1 ? "project" : "projects"} still need your score.`
            : "You are all caught up."}
        </span>
      </header>
      <div className="ops-grid">
        <ActionFeed
          icon={Scale}
          title="Waiting on you"
          items={toScore}
          emptyTitle="Nothing waiting."
          empty="Organizers assign projects to judges once teams submit them."
        />
        <ActionFeed
          title="Already scored"
          items={scored}
          emptyTitle="Nothing yet."
          empty="Projects move here once you submit their scores."
        />
      </div>
    </main>
  );
}

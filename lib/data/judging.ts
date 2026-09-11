import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The projects assigned to one judge, and whether each has been scored.
 *
 * Read access is granted by the assignment row itself, so this returns nothing
 * for an account with no assignments even without a role check in front of it.
 *
 * `project_reviews` is joined through the assignment rather than queried
 * separately, so "have I scored this?" is answered by the same round trip that
 * lists the work.
 */
export async function getJudgingQueue(judgeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_review_assignments")
    .select("id,project_id,projects(name,summary,teams(name)),project_reviews(submitted_at)")
    .eq("judge_id", judgeId)
    .order("assigned_at");
  return (data ?? []).map((assignment) => {
    const project = assignment.projects as unknown as {
      name: string;
      summary: string;
      teams: { name: string } | null;
    } | null;
    const reviews = (assignment.project_reviews ?? []) as unknown as Array<{ submitted_at: string | null }>;
    return {
      id: assignment.id as string,
      projectId: assignment.project_id as string,
      projectName: project?.name ?? "Project",
      summary: project?.summary ?? "",
      teamName: project?.teams?.name ?? "Team",
      scored: reviews.some((review) => review.submitted_at),
    };
  });
}

import { ArrowLeft, Eye, Save } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { saveProjectReviewAction } from "@/app/(portal)/projects/[id]/judge/actions";
import { requireUser } from "@/lib/auth/guards";
import { parseRubric } from "@/lib/reviews/rubric";
import { createClient } from "@/lib/supabase/server";
import { MessageSheet } from "@/components/ui/message-sheet";

/**
 * A judge's scorecard for one assigned project.
 *
 * Access follows the assignment row; the RLS policy on
 * `project_review_assignments` denies a judge any project they were not given.
 */
export default async function ProjectJudgePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const projectId = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!projectId.success) notFound();
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("project_review_assignments")
    .select("id,project_id")
    .eq("project_id", projectId.data)
    .eq("judge_id", user.id)
    .maybeSingle();
  if (!assignment)
    return (
      <MessageSheet
        docket="PROJECT JUDGING"
        title="This project is not assigned to you."
        back={{ href: "/ops", label: "Return to your judging queue" }}
      />
    );
  const [{ data: project }, { data: review }] = await Promise.all([
    supabase.from("projects").select("id,name,summary,event_id,github_url").eq("id", projectId.data).single(),
    supabase
      .from("project_reviews")
      .select("scores,notes,submitted_at")
      .eq("assignment_id", assignment.id)
      .maybeSingle(),
  ]);
  if (!project) notFound();
  const { data: event } = await supabase.from("events").select("project_rubric").eq("id", project.event_id).single();
  const criteria = parseRubric(event?.project_rubric);
  const scores = (review?.scores ?? {}) as Record<string, number>;
  const query = await searchParams;
  const locked = Boolean(review?.submitted_at);
  return (
    <main className="project-judge">
      <header>
        <Link href="/ops">
          <ArrowLeft aria-hidden />
          Judging queue
        </Link>
        <Link href={`/projects/${project.id}`}>
          <Eye aria-hidden />
          Open Project Lens
        </Link>
      </header>
      <section>
        <p>PROJECT SCORE SHEET</p>
        <h1>{project.name}</h1>
        <span>{project.summary}</span>
      </section>
      {query.success ? (
        <p className="workspace-notice workspace-notice--success">
          {query.success === "submitted" ? "Project review submitted and locked." : "Project review draft saved."}
        </p>
      ) : null}
      {query.error ? (
        <p className="workspace-notice workspace-notice--error">Complete every score before submitting.</p>
      ) : null}
      <form className="project-scorecard" action={saveProjectReviewAction.bind(null, project.id, assignment.id, false)}>
        <fieldset disabled={locked}>
          <h2>Score the project</h2>
          {criteria.map((criterion) => (
            <fieldset className="rubric-row" key={criterion.key}>
              <legend>
                {criterion.label}
                <small>{Math.round(criterion.weight * 100)}% weight</small>
              </legend>
              <div>
                {[1, 2, 3, 4, 5].map((score) => (
                  <label key={score}>
                    <input
                      type="radio"
                      name={`score_${criterion.key}`}
                      value={score}
                      defaultChecked={scores[criterion.key] === score}
                    />
                    <span>{score}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <label className="rubric-notes">
            Judge notes
            <textarea name="notes" defaultValue={review?.notes ?? ""} rows={6} maxLength={4000} />
          </label>
        </fieldset>
        <div className="rubric-actions">
          <button type="submit" disabled={locked}>
            <Save aria-hidden />
            Save draft
          </button>
          <button
            className="primary-button"
            type="submit"
            formAction={saveProjectReviewAction.bind(null, project.id, assignment.id, true)}
            disabled={locked}
          >
            Submit scores
          </button>
        </div>
      </form>
    </main>
  );
}

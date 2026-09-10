"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { parseRubric } from "@/lib/reviews/rubric";
import { scoreSchema } from "@/lib/validation/reviews";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Project judging: save or submit one judge's scorecard.
 *
 * Scoped to the judge's own assignment, so a judge cannot score a project they
 * were not assigned. The matching RLS policy on `project_review_assignments`
 * enforces the same restriction at the database, and the pgTAP suite covers it.
 */

const idSchema = z.string().uuid();

export async function saveProjectReviewAction(projectIdValue: string, assignmentIdValue: string, submit: boolean, formData: FormData) {
  const user = await requireUser();
  const projectId = idSchema.parse(projectIdValue);
  const assignmentId = idSchema.parse(assignmentIdValue);
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("project_review_assignments").select("id").eq("id", assignmentId).eq("project_id", projectId).eq("judge_id", user.id).maybeSingle();
  if (!assignment) redirect(`/projects/${projectId}/judge?error=assignment`);
  const { data: project } = await supabase.from("projects").select("event_id").eq("id", projectId).single();
  const { data: event } = project ? await supabase.from("events").select("project_rubric").eq("id", project.event_id).single() : { data: null };
  const criteria = parseRubric(event?.project_rubric);
  const scores: Record<string, number> = {};
  for (const criterion of criteria) {
    const parsed = scoreSchema.safeParse(formData.get(`score_${criterion.key}`));
    if (parsed.success) scores[criterion.key] = parsed.data;
    else if (submit) redirect(`/projects/${projectId}/judge?error=incomplete`);
  }
  const { error } = await supabase.from("project_reviews").upsert({ assignment_id: assignmentId, project_id: projectId, judge_id: user.id, scores: scores as Json, notes: String(formData.get("notes") ?? "").slice(0, 4000), submitted_at: submit ? new Date().toISOString() : null }, { onConflict: "assignment_id" });
  if (error) redirect(`/projects/${projectId}/judge?error=save`);
  revalidatePath(`/projects/${projectId}/judge`);
  redirect(`/projects/${projectId}/judge?success=${submit ? "submitted" : "saved"}`);
}

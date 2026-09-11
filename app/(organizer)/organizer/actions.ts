"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrganizer } from "@/lib/auth/guards";
import { parseRubric } from "@/lib/reviews/rubric";
import {
  reviewIdSchema,
  reviewRecommendationSchema,
  scoreSchema,
  type ReviewActionState,
} from "@/lib/validation/reviews";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/domain/applications";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Organizer review and decision actions.
 *
 * Note the order in each function: look the record up first, then authorize
 * against the event it belongs to. Organizer rights are per-event, so
 * `requireOrganizer()` with no argument would let an organizer of event A act on
 * event B. Reading the row first is what makes the check specific.
 */

/**
 * Claim the one organizer-owned blind review for an application.
 *
 * The database owns the race-sensitive parts: one active claim, organizer-only
 * access, and the transition into review. The action deliberately accepts no
 * reviewer id, so an organizer can never assign somebody else through this UI.
 */
export async function claimReviewAction(applicationIdValue: string) {
  const applicationId = reviewIdSchema.parse(applicationIdValue);
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("event_id,status")
    .eq("id", applicationId)
    .single();
  if (!application) redirect("/organizer/applications?error=missing");
  await requireOrganizer(application.event_id);
  const { error } = await supabase.rpc("claim_application_review", { target_application: applicationId });
  if (error) redirect(`/organizer/applications/${applicationId}/review?error=claim`);
  revalidatePath(`/organizer/applications/${applicationId}/review`);
}

/**
 * Save or submit the claiming organizer's scores.
 *
 * The assignment lookup filters on `reviewer_id` as well as the assignment id, so
 * a staff member cannot post to somebody else's assignment by guessing its id.
 *
 * `submit` distinguishes a draft from a final review: only submitted reviews
 * count toward the aggregate, and submitting is one-way.
 */
export async function saveReviewAction(
  applicationIdValue: string,
  assignmentIdValue: string,
  submit: boolean,
  _: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const applicationId = reviewIdSchema.parse(applicationIdValue);
  const assignmentId = reviewIdSchema.parse(assignmentIdValue);
  const supabase = await createClient();
  const { data: application } = await supabase.from("applications").select("event_id").eq("id", applicationId).single();
  if (!application) return { status: "error", message: "This application is no longer available." };
  const organizer = await requireOrganizer(application.event_id);
  const { data: assignment } = await supabase
    .from("review_assignments")
    .select("id,reviewer_id,status,application_id")
    .eq("id", assignmentId)
    .eq("application_id", applicationId)
    .eq("reviewer_id", organizer.id)
    .maybeSingle();
  if (!assignment || assignment.status === "conflict")
    return { status: "error", message: "This review assignment is not available." };
  const { data: event } = application
    ? await supabase.from("events").select("application_rubric").eq("id", application.event_id).single()
    : { data: null };
  const criteria = parseRubric(event?.application_rubric);
  const scores: Record<string, number> = {};
  const errors: Record<string, string[]> = {};
  for (const criterion of criteria) {
    const parsed = scoreSchema.safeParse(formData.get(`score_${criterion.key}`));
    if (parsed.success) scores[criterion.key] = parsed.data;
    else if (submit) errors[criterion.key] = ["Choose a score from 1 to 5."];
  }
  const recommendation = reviewRecommendationSchema.safeParse(formData.get("recommendation"));
  if (submit && !recommendation.success) errors.recommendation = ["Choose a recommendation."];
  if (Object.keys(errors).length)
    return { status: "error", message: "Complete every rubric criterion before submitting.", errors };

  const payload = {
    assignment_id: assignmentId,
    application_id: applicationId,
    reviewer_id: organizer.id,
    scores: scores as Json,
    recommendation: recommendation.success ? recommendation.data : null,
    private_notes: String(formData.get("privateNotes") ?? "").slice(0, 5000),
    status: submit ? ("submitted" as const) : ("draft" as const),
  };
  const { error } = await supabase.from("application_reviews").upsert(payload, { onConflict: "assignment_id" });
  if (error) return { status: "error", message: "Review save failed. Your entries remain on this page." };
  revalidatePath(`/organizer/applications/${applicationId}/review`);
  return {
    status: submit ? "submitted" : "saved",
    message: submit ? "Organizer blind review submitted and locked." : "Review draft saved.",
  };
}

/**
 * Declare a conflict of interest and hand the application back to the queue.
 *
 * Recusal is a first-class action rather than an informal note. Recording the
 * reason is what makes a decision defensible later.
 */
export async function reportConflictAction(applicationIdValue: string, assignmentIdValue: string, formData: FormData) {
  const applicationId = reviewIdSchema.parse(applicationIdValue);
  const assignmentId = reviewIdSchema.parse(assignmentIdValue);
  const supabase = await createClient();
  const { data: application } = await supabase.from("applications").select("event_id").eq("id", applicationId).single();
  if (!application) redirect("/organizer/applications?error=missing");
  const organizer = await requireOrganizer(application.event_id);
  const reason = String(formData.get("reason") ?? "")
    .trim()
    .slice(0, 1000);
  if (!reason) redirect(`/organizer/applications/${applicationId}/review?error=conflict-reason`);
  await supabase
    .from("review_assignments")
    .update({ status: "conflict", conflict_reason: reason })
    .eq("id", assignmentId)
    .eq("reviewer_id", organizer.id);
  revalidatePath(`/organizer/applications/${applicationId}/review`);
}

/**
 * Record the final decision on an application.
 *
 * The same organizer role owns both the blind rubric and final decision. Postgres
 * requires its submitted blind review before any terminal status can be recorded.
 */
export async function decideApplicationAction(applicationIdValue: string, decisionValue: string) {
  const applicationId = reviewIdSchema.parse(applicationIdValue);
  const decision = reviewRecommendationSchema.parse(decisionValue) as ApplicationStatus;
  const supabase = await createClient();
  const { data: application } = await supabase.from("applications").select("event_id").eq("id", applicationId).single();
  if (!application) redirect("/organizer/applications?error=missing");
  await requireOrganizer(application.event_id);
  const { error } = await supabase.rpc("decide_application", {
    target_application: applicationId,
    target_decision: decision,
  });
  if (error) {
    const errorCode = error.message.includes("One submitted organizer review") ? "one-review-required" : "decision";
    redirect(`/organizer/applications/${applicationId}/review?error=${errorCode}`);
  }
  revalidatePath("/organizer/applications");
  redirect(`/organizer/applications/${applicationId}/review?success=decision`);
}

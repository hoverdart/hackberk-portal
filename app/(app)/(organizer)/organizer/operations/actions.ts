"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireOrganizer } from "@/lib/auth/guards";
import { parseEventDateTime } from "@/lib/formatters/event-time";
import { createClient } from "@/lib/supabase/server";

/**
 * Organizer event-day operations: judge assignment, mentor triage, shift setup.
 *
 * These are the write side of the organizer control sheet in
 * `app/(organizer)/organizer/operations/page.tsx`.
 */

const idSchema = z.string().uuid();
const shiftSchema = z.object({
  title: z.string().trim().min(3).max(120),
  location: z.string().trim().min(2).max(160),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  capacity: z.coerce.number().int().min(1).max(500),
});

/**
 * Assign a judge to a project.
 *
 * Assignment is what grants the judge read access to that project — the RLS
 * policy keys off this row — so this action is an authorization decision, not
 * just scheduling.
 */
export async function assignProjectJudgeAction(projectIdValue: string, formData: FormData) {
  const projectId = idSchema.parse(projectIdValue);
  const judgeId = idSchema.parse(formData.get("judgeId"));
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("event_id").eq("id", projectId).single();
  if (!project) redirect("/organizer/operations?error=project");
  const organizer = await requireOrganizer(project.event_id);
  const { error } = await supabase
    .from("project_review_assignments")
    .insert({ project_id: projectId, judge_id: judgeId, assigned_by: organizer.id });
  revalidatePath("/organizer/operations");
  redirect(error ? "/organizer/operations?error=assignment" : "/organizer/operations?success=assignment");
}

/** Close out a mentor request an organizer has handled or triaged away. */
export async function resolveMentorRequestAction(requestIdValue: string) {
  const requestId = idSchema.parse(requestIdValue);
  const supabase = await createClient();
  const { data: request } = await supabase.from("mentor_requests").select("event_id").eq("id", requestId).single();
  if (!request) redirect("/organizer/operations?error=request");
  await requireOrganizer(request.event_id);
  const { error } = await supabase
    .from("mentor_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", requestId);
  revalidatePath("/organizer/operations");
  redirect(error ? "/organizer/operations?error=request" : "/organizer/operations?success=request");
}

/** Publish a volunteer shift. The schema rejects a shift that ends before it starts. */
export async function createVolunteerShiftAction(eventIdValue: string, formData: FormData) {
  const eventId = idSchema.parse(eventIdValue);
  await requireOrganizer(eventId);
  const parsed = shiftSchema.safeParse({
    title: formData.get("title"),
    location: formData.get("location"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    capacity: formData.get("capacity"),
  });
  if (!parsed.success) redirect("/organizer/operations?error=shift-validation");
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("timezone").eq("id", eventId).maybeSingle();
  if (!event) redirect("/organizer/operations?error=shift");
  let startsAt: Date;
  let endsAt: Date;
  try {
    startsAt = parseEventDateTime(parsed.data.startsAt, event.timezone);
    endsAt = parseEventDateTime(parsed.data.endsAt, event.timezone);
  } catch {
    redirect("/organizer/operations?error=shift-validation");
  }
  if (startsAt >= endsAt) redirect("/organizer/operations?error=shift-validation");
  const { error } = await supabase.from("volunteer_shifts").insert({
    event_id: eventId,
    title: parsed.data.title,
    location: parsed.data.location,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    capacity: parsed.data.capacity,
    checklist: [],
  });
  revalidatePath("/organizer/operations");
  redirect(error ? "/organizer/operations?error=shift" : "/organizer/operations?success=shift");
}

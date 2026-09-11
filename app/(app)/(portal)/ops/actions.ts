"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

/**
 * Role Ops actions — the event-day interactions.
 *
 * Each is small, and each writes a row that some other role reads immediately:
 * a hacker asks for help and it lands on the mentor desk; a mentor claims it and
 * it leaves everyone else's queue. The claim and shift actions rely on database
 * constraints for their races rather than on read-then-write here.
 */

const idSchema = z.string().uuid();

/** A hacker asks for help. Expertise tags route it to the right mentors. */
export async function createMentorRequestAction(eventIdValue: string, formData: FormData) {
  const user = await requireUser();
  const eventId = idSchema.parse(eventIdValue);
  const title = z.string().trim().min(4).max(120).parse(formData.get("title"));
  const description = z.string().trim().min(10).max(1200).parse(formData.get("description"));
  const expertiseTags = formData.getAll("expertiseTags").map(String).slice(0, 12);
  const supabase = await createClient();
  const { error } = await supabase.from("mentor_requests").insert({
    event_id: eventId,
    requester_id: user.id,
    title,
    description,
    expertise_tags: expertiseTags,
    status: "open",
  });
  revalidatePath("/ops");
  redirect(error ? "/ops?error=request" : "/ops?success=request");
}

/**
 * A mentor claims an open request.
 *
 * First claim wins; the database enforces that so two mentors clicking at the
 * same moment cannot both end up owning it.
 */
export async function claimMentorRequestAction(requestIdValue: string) {
  await requireUser();
  const requestId = idSchema.parse(requestIdValue);
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_mentor_request", { target_request: requestId });
  revalidatePath("/ops");
  redirect(error ? "/ops?error=claim" : "/ops?success=claim");
}

/**
 * A volunteer takes a shift.
 *
 * The shift's capacity is a database constraint for the same reason — checking it
 * here and inserting afterwards would leave a window for oversubscription.
 */
export async function joinVolunteerShiftAction(shiftIdValue: string) {
  await requireUser();
  const shiftId = idSchema.parse(shiftIdValue);
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_volunteer_shift", { target_shift: shiftId });
  revalidatePath("/ops");
  redirect(error ? "/ops?error=shift" : "/ops?success=shift");
}

/**
 * The mentor who claimed a request closes it out.
 *
 * Previously only an organizer could resolve anything, so a mentor could take a
 * request and then had no way to say they had finished — the request sat in the
 * organizer's queue until someone noticed. `mentor_requests_participant_update`
 * already allowed this write (`claimed_by = auth.uid()`); nothing in the
 * interface used it.
 *
 * The filter on `claimed_by` is not the security boundary — RLS is — but it
 * makes the intent explicit and turns a wrong id into zero rows rather than an
 * error.
 */
export async function resolveOwnMentorRequestAction(requestIdValue: string) {
  const user = await requireUser();
  const requestId = idSchema.parse(requestIdValue);
  const supabase = await createClient();
  const { error } = await supabase
    .from("mentor_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("claimed_by", user.id);
  revalidatePath("/ops");
  redirect(error ? "/ops?error=resolve" : "/ops?success=resolve");
}

/**
 * A volunteer checks in for a shift they hold.
 *
 * `checked_in_at` has existed since the first migration and nothing ever wrote
 * to it, so an organizer had no way to tell who had actually turned up.
 */
export async function checkInShiftAction(shiftIdValue: string) {
  const user = await requireUser();
  const shiftId = idSchema.parse(shiftIdValue);
  const supabase = await createClient();
  const { error } = await supabase
    .from("volunteer_shift_assignments")
    .update({ checked_in_at: new Date().toISOString() })
    .eq("shift_id", shiftId)
    .eq("volunteer_id", user.id);
  revalidatePath("/ops");
  redirect(error ? "/ops?error=checkin" : "/ops?success=checkin");
}

/**
 * Tick or untick one item on a shift's checklist.
 *
 * The shift carries the list of tasks and each volunteer carries their own
 * progress through it, which is why the state lives on the assignment rather
 * than on the shift. Both columns were in the schema and seeded with real
 * content; neither had ever been rendered.
 *
 * The whole map is rewritten rather than patched because one volunteer owns one
 * row: there is no second writer to race with.
 */
export async function toggleShiftTaskAction(shiftIdValue: string, formData: FormData) {
  const user = await requireUser();
  const shiftId = idSchema.parse(shiftIdValue);
  const task = z.string().min(1).max(200).parse(formData.get("task"));
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("volunteer_shift_assignments")
    .select("checklist_state")
    .eq("shift_id", shiftId)
    .eq("volunteer_id", user.id)
    .maybeSingle();
  const state = { ...((assignment?.checklist_state ?? {}) as Record<string, boolean>) };
  state[task] = !state[task];
  const { error } = await supabase
    .from("volunteer_shift_assignments")
    .update({ checklist_state: state })
    .eq("shift_id", shiftId)
    .eq("volunteer_id", user.id);
  revalidatePath("/ops");
  redirect(error ? "/ops?error=task" : "/ops?success=task");
}

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
  const { error } = await supabase.from("mentor_requests").insert({ event_id: eventId, requester_id: user.id, title, description, expertise_tags: expertiseTags, status: "open" });
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

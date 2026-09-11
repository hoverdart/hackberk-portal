"use server";

import { uuidSchema } from "@/lib/validation/applications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

/**
 * Team Match actions: matching profile, team creation, invitations.
 *
 * Team membership is invitation-based in both directions — nobody is added to a
 * team without an invitation they accepted — and the four-member cap is enforced
 * by a database constraint rather than by a check here, so a race between two
 * simultaneous acceptances cannot produce a team of five.
 */

/**
 * Save the matching profile that drives the ranking.
 *
 * `opted_in` is the consent switch. Nobody appears in anyone else's candidate
 * list until they set it, which is why Team Match is opt-in rather than
 * automatic.
 */
export async function saveMatchingProfileAction(eventIdValue: string, formData: FormData) {
  const user = await requireUser();
  const eventId = uuidSchema.parse(eventIdValue);
  const payload = {
    event_id: eventId,
    user_id: user.id,
    skills: formData.getAll("skills").map(String).slice(0, 20),
    interests: formData.getAll("interests").map(String).slice(0, 20),
    goals: formData.getAll("goals").map(String).slice(0, 12),
    availability: formData.getAll("availability").map(String).slice(0, 20),
    experience_level: Math.min(5, Math.max(1, Number(formData.get("experienceLevel")) || 1)),
    bio: String(formData.get("bio") ?? "").slice(0, 800),
    opted_in: formData.get("optedIn") === "on",
  };
  const supabase = await createClient();
  const { error } = await supabase.from("matching_profiles").upsert(payload, { onConflict: "event_id,user_id" });
  revalidatePath("/teams");
  redirect(error ? "/teams?error=profile" : "/teams?success=profile");
}

/** Create a team and add the creator as its first member. */
export async function createTeamAction(eventIdValue: string, formData: FormData) {
  await requireUser();
  const eventId = uuidSchema.parse(eventIdValue);
  const name = z.string().trim().min(2).max(80).parse(formData.get("name"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_hacker_team", { target_event: eventId, team_name: name });
  revalidatePath("/teams");
  redirect(error ? "/teams?error=create" : "/teams?success=created");
}

/** Invite one hacker to a team. Creates a pending invitation, not a membership. */
export async function inviteToTeamAction(teamIdValue: string, recipientIdValue: string) {
  const user = await requireUser();
  const teamId = uuidSchema.parse(teamIdValue);
  const recipientId = uuidSchema.parse(recipientIdValue);
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_invitations")
    .insert({ team_id: teamId, sender_id: user.id, recipient_id: recipientId, status: "pending" });
  revalidatePath("/teams");
  redirect(error ? "/teams?error=invite" : "/teams?success=invited");
}

/**
 * Accept or decline an invitation.
 *
 * Accepting is the only path into a team, and it is where the capacity constraint
 * is finally tested.
 */
export async function respondInvitationAction(invitationIdValue: string, accept: boolean) {
  await requireUser();
  const invitationId = uuidSchema.parse(invitationIdValue);
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_team_invitation", {
    target_invitation: invitationId,
    accept_invitation: accept,
  });
  revalidatePath("/teams");
  redirect(error ? "/teams?error=respond" : `/teams?success=${accept ? "joined" : "declined"}`);
}

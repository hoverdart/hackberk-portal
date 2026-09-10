"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export async function saveMatchingProfileAction(eventIdValue: string, formData: FormData) {
  const user = await requireUser();
  const eventId = idSchema.parse(eventIdValue);
  const payload = {
    event_id: eventId, user_id: user.id,
    skills: formData.getAll("skills").map(String).slice(0, 20), interests: formData.getAll("interests").map(String).slice(0, 20),
    goals: formData.getAll("goals").map(String).slice(0, 12), availability: formData.getAll("availability").map(String).slice(0, 20),
    experience_level: Math.min(5, Math.max(1, Number(formData.get("experienceLevel")) || 1)), bio: String(formData.get("bio") ?? "").slice(0, 800), opted_in: formData.get("optedIn") === "on",
  };
  const supabase = await createClient();
  const { error } = await supabase.from("matching_profiles").upsert(payload, { onConflict: "event_id,user_id" });
  revalidatePath("/teams");
  redirect(error ? "/teams?error=profile" : "/teams?success=profile");
}

export async function createTeamAction(eventIdValue: string, formData: FormData) {
  await requireUser();
  const eventId = idSchema.parse(eventIdValue);
  const name = z.string().trim().min(2).max(80).parse(formData.get("name"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_hacker_team", { target_event: eventId, team_name: name });
  revalidatePath("/teams");
  redirect(error ? "/teams?error=create" : "/teams?success=created");
}

export async function inviteToTeamAction(teamIdValue: string, recipientIdValue: string) {
  const user = await requireUser();
  const teamId = idSchema.parse(teamIdValue);
  const recipientId = idSchema.parse(recipientIdValue);
  const supabase = await createClient();
  const { error } = await supabase.from("team_invitations").insert({ team_id: teamId, sender_id: user.id, recipient_id: recipientId, status: "pending" });
  revalidatePath("/teams");
  redirect(error ? "/teams?error=invite" : "/teams?success=invited");
}

export async function respondInvitationAction(invitationIdValue: string, accept: boolean) {
  await requireUser();
  const invitationId = idSchema.parse(invitationIdValue);
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_team_invitation", { target_invitation: invitationId, accept_invitation: accept });
  revalidatePath("/teams");
  redirect(error ? "/teams?error=respond" : `/teams?success=${accept ? "joined" : "declined"}`);
}

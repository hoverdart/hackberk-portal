import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) redirect("/sign-in");

  return {
    id: userId,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

/** Staff checks are database-backed so editable auth metadata can never grant access. */
export async function requireOrganizer(eventId?: string) {
  const user = await requireUser();
  const supabase = await createClient();
  let query = supabase
    .from("staff_members")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("role", "organizer")
    .limit(1);
  if (eventId) query = query.eq("event_id", eventId);
  const { data } = await query.maybeSingle();
  if (!data) redirect("/dashboard?notice=organizer-required");
  return { ...user, eventId: data.event_id as string };
}

export async function requireEventStaff(eventId?: string) {
  const user = await requireUser();
  const supabase = await createClient();
  let query = supabase.from("staff_members").select("event_id,role").eq("user_id", user.id).limit(1);
  if (eventId) query = query.eq("event_id", eventId);
  const { data } = await query.maybeSingle();
  if (!data) redirect("/dashboard?notice=staff-required");
  return { ...user, eventId: data.event_id as string, staffRole: data.role };
}

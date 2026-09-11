import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Everything the Team Match page needs: your matching profile, your current
 * team, pending invitations, and ranked candidates.
 *
 * The ranking itself runs in Postgres (`team_match_candidates`) rather than here,
 * so it can see every opted-in profile without shipping them all to the server.
 * The RPC returns ids and scores only; the display names are fetched separately
 * below, which keeps the ranking function free of presentation concerns.
 */
export async function getTeamMatchData(userId: string, eventId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: membership }, { data: invitations }, { data: matches }] = await Promise.all([
    supabase
      .from("matching_profiles")
      .select("skills,interests,goals,availability,experience_level,bio,opted_in")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("team_members")
      .select("team_id,teams(id,name,event_id,created_by)")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("team_invitations")
      .select("id,team_id,sender_id,status,teams(name)")
      .eq("recipient_id", userId)
      .eq("status", "pending"),
    supabase.rpc("team_match_candidates", { target_event: eventId }),
  ]);
  const matchRows = matches ?? [];
  const ids = matchRows.map((match) => match.user_id);
  // Guard on `ids.length`: an `.in()` with an empty array is a wasted round trip.
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id,preferred_name,full_name,school").in("id", ids)
    : { data: [] };
  const teamId = membership?.team_id;
  const { data: memberRows } = teamId
    ? await supabase.from("team_members").select("user_id").eq("team_id", teamId)
    : { data: [] };
  const memberIds = (memberRows ?? []).map((member) => member.user_id);
  const { data: memberProfiles } = memberIds.length
    ? await supabase.from("profiles").select("id,full_name,preferred_name").in("id", memberIds)
    : { data: [] };
  // Stitch profiles onto members in memory. A join would be tidier, but the
  // membership and profile tables have different RLS policies and joining them
  // in one query makes it much harder to reason about what each one exposes.
  const members = (memberRows ?? []).map((member) => ({
    ...member,
    profiles: memberProfiles?.find((profile) => profile.id === member.user_id),
  }));
  return {
    profile,
    membership,
    invitations: invitations ?? [],
    matches: matchRows.map((match) => ({ ...match, person: people?.find((person) => person.id === match.user_id) })),
    members,
  };
}

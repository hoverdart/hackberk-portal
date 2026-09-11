import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Route guards.
 *
 * Each guard answers "may this request continue?" and redirects if not. They are
 * the interface-level half of authorization; the database half lives in the RLS
 * policies. Both are required: the guards give a signed-out visitor a sensible
 * redirect instead of an empty page, and RLS makes sure a missing guard cannot
 * turn into a data leak.
 */

/**
 * Resolve the signed-in user, or redirect to sign-in.
 *
 * Wrapped in React's `cache` so that a single render calling this from the page,
 * the layout, and three data helpers still performs one token verification. The
 * cache is per-request, so it never leaks one user's identity into another's
 * render.
 *
 * `getClaims` verifies the JWT signature. `getSession` would not, so it must
 * never be substituted here.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) redirect("/sign-in");

  return {
    id: userId,
    // The email claim is informational only. Never branch on it for access —
    // it is not a stable identifier the way `sub` is.
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

/**
 * Resolve the current account's organizer membership, if it has one.
 *
 * This is intentionally a database read rather than a JWT claim: membership is
 * current immediately after the test-signup action and is the same authority RLS
 * uses for organizer routes.
 */
export const getOrganizerMembership = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_members")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("role", "organizer")
    .limit(1)
    .maybeSingle();
  return data ? { ...user, eventId: data.event_id as string } : null;
});

/** Redirect organizer accounts out of applicant-only workflows. */
export async function requireApplicant() {
  const organizer = await getOrganizerMembership();
  if (organizer) redirect("/organizer/applications");
  return requireUser();
}

/**
 * Require that the user is an organizer, optionally for one specific event.
 *
 * The check reads `staff_members` rather than the JWT's `app_metadata`. That is
 * deliberate: auth metadata can be edited through the auth admin API and is
 * copied into the token at sign-in, so a stale or tampered token could otherwise
 * carry organizer rights. A table read is always current, and the same table is
 * what the RLS policies consult, so the interface and the database agree.
 */
export async function requireOrganizer(eventId?: string) {
  const organizer = await getOrganizerMembership();
  if (!organizer) redirect("/dashboard?notice=organizer-required");
  if (!eventId || organizer.eventId === eventId) return organizer;

  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_members")
    .select("event_id")
    .eq("user_id", organizer.id)
    .eq("role", "organizer")
    .eq("event_id", eventId)
    .maybeSingle();
  if (!data) redirect("/dashboard?notice=organizer-required");

  // Callers get the event id back so they do not have to re-query for it.
  return { ...organizer, eventId: data.event_id as string };
}

/**
 * Require any staff role (organizer, judge, mentor, volunteer) for an event.
 *
 * Broader than `requireOrganizer`: used by surfaces that several staff roles
 * share, where the specific role then decides what is shown rather than whether
 * the page renders at all.
 */
export async function requireEventStaff(eventId?: string) {
  const user = await requireUser();
  const supabase = await createClient();

  let query = supabase.from("staff_members").select("event_id,role").eq("user_id", user.id).limit(1);
  if (eventId) query = query.eq("event_id", eventId);

  const { data } = await query.maybeSingle();
  if (!data) redirect("/dashboard?notice=staff-required");

  return { ...user, eventId: data.event_id as string, staffRole: data.role };
}

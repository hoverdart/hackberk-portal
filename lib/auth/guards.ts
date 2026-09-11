import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationRole } from "@/lib/domain/applications";

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
 * The roles this account has actually been accepted for.
 *
 * Holding a role is not something you pick at sign-up: every account can apply
 * for all four, and you hold one only once an organizer accepts that
 * application. This is the single place that decides it, so the rail, the
 * event-day page and the judging queue cannot disagree about who someone is.
 *
 * `cache`d per request, because the layout and the page both ask.
 */
export const getAcceptedRoles = cache(async (eventId?: string) => {
  const user = await requireUser();
  const supabase = await createClient();
  let query = supabase.from("applications").select("role").eq("applicant_id", user.id).eq("status", "accepted");
  if (eventId) query = query.eq("event_id", eventId);
  const { data } = await query;
  return new Set((data ?? []).map((row) => row.role as ApplicationRole));
});

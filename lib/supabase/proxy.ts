import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicSupabaseConfig } from "@/lib/supabase/shared";

/**
 * Route prefixes that require a signed-in user.
 *
 * This list is an optimisation, not a security boundary. It saves an
 * unauthenticated visitor a wasted render, but the real enforcement is the
 * `requireUser` / `requireOrganizer` guard inside each page plus the RLS
 * policies in Postgres. Forgetting to add a prefix here leaks nothing; it just
 * means the visitor reaches the page and gets redirected a moment later.
 */
const protectedPrefixes = ["/dashboard", "/applications", "/teams", "/projects", "/ops", "/profile", "/organizer"];

/** Pages a signed-in user has no reason to see; they get sent to the dashboard. */
const authPages = ["/sign-in", "/sign-up"];

/**
 * Runs before every matching request (see `proxy.ts` at the repo root for the
 * matcher). It has two jobs:
 *
 *  1. Refresh the Supabase auth cookies. Access tokens are short-lived, and this
 *     is the one place in the request lifecycle that can reliably write the
 *     rotated cookie back to the browser — Server Components often cannot.
 *  2. Do a cheap redirect for obviously-wrong destinations.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getPublicSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        // Write the refreshed cookies to both sides: onto `request` so anything
        // later in this same request sees the new token, and onto a rebuilt
        // `response` so the browser actually receives them.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // `getClaims` verifies the JWT signature against the project's keys. `getSession`
  // would be faster but only decodes whatever is in the cookie, so a forged cookie
  // would pass it — never use `getSession` to make an access decision.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (protectedPrefixes.some((prefix) => path.startsWith(prefix)) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    // Remember where they were headed so sign-in can return them there.
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (authPages.includes(path) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Returning `response` (rather than a fresh NextResponse) is what preserves any
  // refreshed cookies the client set above.
  return response;
}

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicSupabaseConfig } from "@/lib/supabase/shared";

const protectedPrefixes = ["/dashboard", "/applications", "/teams", "/projects", "/ops", "/organizer"];
const authPages = ["/sign-in", "/sign-up"];

/** Refreshes auth cookies and performs only a fast optimistic route check. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getPublicSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims validates the token signature; getSession alone must not authorize access.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (protectedPrefixes.some((prefix) => path.startsWith(prefix)) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (authPages.includes(path) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * The request filter that runs before every route.
 *
 * Named `proxy.ts` rather than `middleware.ts`: Next 16 renamed the convention,
 * and the export must be `proxy` to match.
 *
 * Its only job is refreshing the Supabase session cookie and issuing an
 * optimistic redirect — it is not an authorization boundary, and
 * `lib/supabase/proxy.ts` says so at length. Every page and Server Action
 * repeats its own check near the data.
 *
 * The matcher excludes anything the filter could only slow down: build output,
 * the image optimizer, the favicon, and static image requests. Those carry no
 * session to refresh, and running a token check on each one would put a network
 * round trip in front of every asset on the page.
 */

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

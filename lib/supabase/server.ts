import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicSupabaseConfig } from "@/lib/supabase/shared";
import type { Database } from "@/lib/supabase/database.types";

/**
 * The request-scoped Supabase client used by every Server Component and Server
 * Action.
 *
 * `import "server-only"` at the top is a build-time tripwire: if any client
 * component ever imports this module, the build fails rather than shipping
 * cookie-reading code to the browser.
 *
 * This client reads the caller's session from the request cookies, so every
 * query it issues runs as that user. That is the whole authorization story —
 * the queries below do not filter by user id for security, they rely on RLS to
 * do it, and any `.eq("user_id", ...)` you see in `lib/data` is there to shape
 * the result, not to protect it.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // A pure Server Component render has no mutable response to attach
          // cookies to, and Next throws if you try. That is expected and safe to
          // swallow here: the proxy in `lib/supabase/proxy.ts` runs on every
          // matching request and performs the authoritative refresh, so a token
          // rotated during this render is still written back to the browser.
        }
      },
    },
  });
}

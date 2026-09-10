import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicSupabaseConfig } from "@/lib/supabase/shared";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Request-scoped SSR client. Cookie writes can be unavailable during a pure Server
 * Component render; Proxy performs the authoritative token refresh and propagation.
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
          // Server Components cannot always mutate response cookies. Proxy refreshes them.
        }
      },
    },
  });
}

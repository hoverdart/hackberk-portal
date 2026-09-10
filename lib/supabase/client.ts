"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseConfig } from "@/lib/supabase/shared";
import type { Database } from "@/lib/supabase/database.types";

/** Browser client: publishable key only. Database authorization is still enforced by RLS. */
export function createClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}

"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseConfig } from "@/lib/supabase/shared";

/** Browser client: publishable key only. Database authorization is still enforced by RLS. */
export function createClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  return createBrowserClient(url, publishableKey);
}

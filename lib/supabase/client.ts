"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseConfig } from "@/lib/supabase/shared";
import type { Database } from "@/lib/supabase/database.types";

/**
 * The browser-side Supabase client.
 *
 * Almost nothing in this portal uses it: reads happen in Server Components and
 * writes happen in Server Actions, so the browser rarely needs to talk to the
 * database directly. It exists for the few client interactions that must, and
 * for parity with the server client's typing.
 *
 * It carries the publishable key and whatever session cookie the browser holds.
 * That combination is not a privilege — authorization is still decided in
 * Postgres by the Row Level Security policies in `supabase/migrations`. A user
 * who opens the devtools and queries with this client sees exactly what the
 * interface shows them.
 */
export function createClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}

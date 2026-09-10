/**
 * Configuration shared by every Supabase client in the app — browser, server, and
 * proxy alike.
 *
 * Only two values live here, and both are deliberately public. `NEXT_PUBLIC_*`
 * variables are inlined into the browser bundle at build time, so anything read
 * through this module must be safe for anyone to see. The publishable key is:
 * on its own it grants nothing, because every table is protected by Row Level
 * Security and the key carries no identity until a user's JWT is attached.
 *
 * The privileged values — the service role key and `CONNECTION_URL` — are never
 * read here. They belong to migrations and administrative scripts only, and
 * prefixing either with `NEXT_PUBLIC_` would publish full database access to
 * every visitor.
 */
export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Fail loudly at the first call rather than letting requests fail later with an
  // opaque network error against `undefined`.
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, publishableKey };
}

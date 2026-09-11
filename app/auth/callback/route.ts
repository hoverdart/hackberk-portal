import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * The password-reset and email-link landing route.
 *
 * Supabase sends users here from an email link, in one of two shapes: a `code` to
 * exchange (PKCE) or a `token_hash` plus `type` to verify (OTP). Whichever
 * arrives, the result is a session cookie set on the redirect response.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = url.searchParams.get("next") ?? "/dashboard";
  // Open-redirect guard. `next` comes from the URL, so an attacker could put
  // `https://evil.example` in it and use the emailed link to bounce a trusting
  // user off-site. Requiring a single leading slash keeps the destination inside
  // this app; the `//` test rejects protocol-relative URLs, which browsers treat
  // as absolute despite starting with a slash.
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";
  const supabase = await createClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing authentication token") };

  return NextResponse.redirect(new URL(result.error ? "/sign-in?error=callback" : next, url.origin));
}

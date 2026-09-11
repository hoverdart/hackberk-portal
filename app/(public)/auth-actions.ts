"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { emailSchema, passwordSchema, signInSchema, signUpSchema, type AuthActionState } from "@/lib/validation/auth";

/**
 * Authentication Server Actions.
 *
 * "use server" makes each exported function a POST endpoint that the browser can
 * call by name. They are therefore public entry points: validate everything, and
 * never trust an argument because a form supplied it.
 *
 * These are the only actions in the app that run without a session, since their
 * whole job is to create one.
 */

function validationError(error: { flatten(): { fieldErrors: Record<string, string[]> } }): AuthActionState {
  return { status: "error", message: "Check the highlighted fields.", errors: error.flatten().fieldErrors };
}

/**
 * Register an account and open its first session immediately.
 *
 * `full_name` goes into the user's metadata, where a database trigger copies it
 * into `profiles`. Email confirmation is disabled in the Auth provider, so
 * `signUp` returns a session and the person can continue directly to the portal.
 */
export async function signUpAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    accountType: formData.get("accountType") ?? "applicant",
  });
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });
  if (error) return { status: "error", message: error.message };
  if (!data.session)
    return { status: "error", message: "Your account was created, but we could not open a session. Please sign in." };

  if (parsed.data.accountType === "organizer") {
    const { error: organizerError } = await supabase.rpc("claim_test_organizer_membership");
    if (organizerError)
      return {
        status: "error",
        message:
          "Your account was created, but test organizer access could not be set up. Please sign in and try again.",
      };
    redirect("/organizer/applications");
  }

  redirect("/dashboard");
}

/**
 * Sign in with a password.
 *
 * The error message is deliberately identical whether the email is unknown or the
 * password is wrong: distinguishing them turns this form into an account-
 * enumeration oracle.
 *
 * `redirect` throws internally, so nothing after it runs — that is why this
 * function has no explicit return on the success path.
 */
export async function signInAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: "We could not sign you in. Check your email and password." };
  redirect("/dashboard");
}

/**
 * Send a password reset link.
 *
 * Always reports success, even when no such account exists — see the note below.
 * The result of `resetPasswordForEmail` is intentionally not inspected.
 */
export async function forgotPasswordAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "error", errors: { email: parsed.error.issues.map((issue) => issue.message) } };
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // Avoid revealing whether an account exists.
  return { status: "success", message: "If that account exists, a reset link is on its way." };
}

/**
 * Set a new password for the already-authenticated user.
 *
 * Reached through the emailed reset link, which establishes a session before this
 * runs. Supabase resolves the identity from that session, so there is no user id
 * parameter here for a caller to tamper with.
 */
export async function updatePasswordAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success)
    return { status: "error", errors: { password: parsed.error.issues.map((issue) => issue.message) } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { status: "error", message: error.message };
  return { status: "success", message: "Password updated. You can return to your dashboard." };
}

/** Clear the session cookies and return to sign-in. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { emailSchema, passwordSchema, signInSchema, signUpSchema, type AuthActionState } from "@/lib/validation/auth";

function validationError(error: { flatten(): { fieldErrors: Record<string, string[]> } }): AuthActionState {
  return { status: "error", message: "Check the highlighted fields.", errors: error.flatten().fieldErrors };
}

export async function signUpAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { status: "error", message: error.message };

  return {
    status: "success",
    message: "Check your inbox to verify your email, then return to the Run of Show.",
  };
}

export async function signInAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: "We could not sign you in. Check your email and password." };
  redirect("/dashboard");
}

export async function forgotPasswordAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "error", errors: { email: parsed.error.issues.map((issue) => issue.message) } };
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  // Avoid revealing whether an account exists.
  return { status: "success", message: "If that account exists, a reset link is on its way." };
}

export async function updatePasswordAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { status: "error", errors: { password: parsed.error.issues.map((issue) => issue.message) } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { status: "error", message: error.message };
  return { status: "success", message: "Password updated. You can return to your dashboard." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

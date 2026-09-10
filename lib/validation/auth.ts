import { z } from "zod";

/**
 * Schemas for the four authentication forms.
 *
 * Every one of these is evaluated on the server inside a Server Action, never in
 * the browser. The browser gets the resulting messages back and displays them,
 * but it is not trusted to have run the check — a request crafted outside the
 * form hits exactly the same validation.
 */

export const emailSchema = z.string().trim().email("Enter a valid email address.");

/**
 * Password rules for new passwords.
 *
 * Length is doing most of the work here; the letter and number requirements are
 * a floor against the very weakest choices rather than a serious composition
 * policy. Supabase applies its own minimum on top of this.
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .regex(/[a-zA-Z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Sign-in deliberately does NOT reuse `passwordSchema`. Applying today's rules
 * to an existing password would lock out anyone who registered under older ones,
 * and telling an unauthenticated caller that their password is "too short" leaks
 * information. Any non-empty string is accepted here and Supabase decides.
 */
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });

/**
 * The shape returned by every auth Server Action and consumed by `useActionState`
 * in `components/auth/auth-form.tsx`. `errors` is keyed by field name so the form
 * can place each message under its own input.
 */
export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialAuthState: AuthActionState = { status: "idle" };

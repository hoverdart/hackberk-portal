"use client";

import Link from "next/link";
import { useActionState } from "react";

import { initialAuthState, type AuthActionState } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";

type AuthFormProps = {
  mode: "sign-in" | "sign-up" | "forgot" | "reset";
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
};

/**
 * One form component for all four authentication modes.
 *
 * They share a layout, a validation contract and an error surface, so a single
 * component with a `mode` beats four near-identical ones — a fix to the error
 * handling lands on all of them at once. The `copy` map below is the only thing
 * that varies.
 */

const copy = {
  "sign-in": {
    title: "Sign in",
    intro: "One account covers every role you apply for.",
    submit: "Sign in",
    helper: "New here?",
    helperLink: "Create an account",
    href: "/sign-up",
  },
  "sign-up": {
    title: "Create your account",
    intro: "One account covers every role you apply for.",
    submit: "Create account",
    helper: "Already registered?",
    helperLink: "Sign in",
    href: "/sign-in",
  },
  forgot: {
    title: "Reset your password",
    intro: "We’ll email you a link to choose a new one.",
    submit: "Send reset link",
    helper: "Remembered it?",
    helperLink: "Sign in",
    href: "/sign-in",
  },
  reset: {
    title: "Choose a new password",
    intro: "Pick something you haven’t used here before.",
    submit: "Update password",
    helper: "Ready to return?",
    helperLink: "Go to your dashboard",
    href: "/dashboard",
  },
} as const;

/**
 * `useActionState` binds the form to its Server Action: `pending` is true while
 * the action runs, and `state` carries back the message and per-field errors.
 * The form works without JavaScript too — it is a real `<form action=...>`.
 */
export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthState);
  const labels = copy[mode];

  return (
    <section className="auth-sheet" aria-labelledby="auth-title">
      <h1 id="auth-title">{labels.title}</h1>
      <p className="auth-intro">{labels.intro}</p>
      <form action={formAction} className="auth-form" noValidate>
        {mode === "sign-up" ? (
          <Field id="fullName" label="Full name" autoComplete="name" error={state.errors?.fullName?.[0]} />
        ) : null}
        {mode !== "reset" ? (
          <Field id="email" label="Email" type="email" autoComplete="email" error={state.errors?.email?.[0]} />
        ) : null}
        {mode !== "forgot" ? (
          <Field
            id="password"
            label={mode === "reset" ? "New password" : "Password"}
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            error={state.errors?.password?.[0]}
          />
        ) : null}
        {mode === "sign-up" ? (
          <div className="signup-actions">
            <Button variant="primary" full type="submit" name="accountType" value="applicant" disabled={pending}>
              {pending ? "Working…" : "Create an applicant account"}
            </Button>
            <Button
              variant="secondary"
              full
              size="sm"
              type="submit"
              name="accountType"
              value="organizer"
              disabled={pending}
            >
              Create an organizer account
            </Button>
            <p>Organizer accounts review and decide applications. They cannot submit one.</p>
          </div>
        ) : (
          <Button variant="primary" full type="submit" disabled={pending}>
            {pending ? "Working…" : labels.submit}
          </Button>
        )}
        {/* `aria-live` announces the result to a screen reader without moving
            focus, and the element is always present so the announcement fires
            reliably rather than being missed as a newly-inserted node. */}
        <p className={`form-message form-message--${state.status}`} aria-live="polite">
          {state.message}
        </p>
      </form>
      <p className="auth-helper">
        {labels.helper} <Link href={labels.href}>{labels.helperLink}</Link>
      </p>
      {mode === "sign-in" ? (
        <Link className="auth-forgot" href="/forgot-password">
          Forgot password?
        </Link>
      ) : null}
    </section>
  );
}

/**
 * One labelled input.
 *
 * The label wraps the input, so a click anywhere on it focuses the field without
 * needing a matching `for`/`id` pair to be kept in sync. `aria-invalid` and
 * `aria-describedby` tie the error message to the input for screen readers;
 * `noValidate` on the form means these messages, not the browser's, are what the
 * user sees.
 */
function Field({
  id,
  label,
  type = "text",
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete: string;
  error?: string;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? <small id={`${id}-error`}>{error}</small> : null}
    </label>
  );
}

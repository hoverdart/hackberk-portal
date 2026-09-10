"use client";

import Link from "next/link";
import { useActionState } from "react";

import { initialAuthState, type AuthActionState } from "@/lib/validation/auth";

type AuthFormProps = {
  mode: "sign-in" | "sign-up" | "forgot" | "reset";
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
};

const copy = {
  "sign-in": { title: "Open your runbook", submit: "Sign in", helper: "New here?", helperLink: "Create an account", href: "/sign-up" },
  "sign-up": { title: "Get your credentials", submit: "Create account", helper: "Already registered?", helperLink: "Sign in", href: "/sign-in" },
  forgot: { title: "Reset your access", submit: "Send reset link", helper: "Remembered it?", helperLink: "Sign in", href: "/sign-in" },
  reset: { title: "Choose a new password", submit: "Update password", helper: "Ready to return?", helperLink: "Open dashboard", href: "/dashboard" },
} as const;

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthState);
  const labels = copy[mode];

  return (
    <section className="auth-sheet" aria-labelledby="auth-title">
      <p className="auth-docket">RUN OF SHOW · ACCESS DESK</p>
      <h1 id="auth-title">{labels.title}</h1>
      <p className="auth-intro">One account, four ways to build a bigger Berkeley.</p>
      <form action={formAction} className="auth-form" noValidate>
        {mode === "sign-up" ? <Field id="fullName" label="Full name" autoComplete="name" error={state.errors?.fullName?.[0]} /> : null}
        {mode !== "reset" ? <Field id="email" label="Email" type="email" autoComplete="email" error={state.errors?.email?.[0]} /> : null}
        {mode !== "forgot" ? <Field id="password" label={mode === "reset" ? "New password" : "Password"} type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} error={state.errors?.password?.[0]} /> : null}
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Working…" : labels.submit}
        </button>
        <p className={`form-message form-message--${state.status}`} aria-live="polite">{state.message}</p>
      </form>
      <p className="auth-helper">{labels.helper} <Link href={labels.href}>{labels.helperLink}</Link></p>
      {mode === "sign-in" ? <Link className="auth-forgot" href="/forgot-password">Forgot password?</Link> : null}
    </section>
  );
}

function Field({ id, label, type = "text", autoComplete, error }: { id: string; label: string; type?: string; autoComplete: string; error?: string }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={id} type={type} autoComplete={autoComplete} required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      {error ? <small id={`${id}-error`}>{error}</small> : null}
    </label>
  );
}

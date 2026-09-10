import { z } from "zod";

import { applicationRoles } from "@/lib/domain/applications";

/**
 * Shared validation for the application forms.
 *
 * Both schemas guard values that arrive from the URL or a form body, where the
 * caller controls the string entirely. Parsing them before they reach a query
 * turns a malformed `/applications/wizard` into a clean 400-style redirect
 * instead of a database error.
 */

export const applicationRoleSchema = z.enum(applicationRoles);
export const uuidSchema = z.string().uuid("Invalid record identifier.");

/**
 * State for the application wizard's Server Actions.
 *
 * `stale` is the interesting one: the wizard sends the `answerVersion` it was
 * rendered from, and the action refuses the write if the stored version has moved
 * on. That is optimistic concurrency — it stops a second tab, or a phone left open
 * on an old step, from silently overwriting newer answers.
 */
export type ApplicationActionState = {
  status: "idle" | "saving" | "saved" | "error" | "stale";
  message?: string;
  errors?: Record<string, string[]>;
  answerVersion?: number;
};

export const initialApplicationState: ApplicationActionState = { status: "idle" };

import { z } from "zod";

import { applicationRoles } from "@/lib/domain/applications";

export const applicationRoleSchema = z.enum(applicationRoles);
export const uuidSchema = z.string().uuid("Invalid record identifier.");

export type ApplicationActionState = {
  status: "idle" | "saving" | "saved" | "error" | "stale";
  message?: string;
  errors?: Record<string, string[]>;
  answerVersion?: number;
};

export const initialApplicationState: ApplicationActionState = { status: "idle" };

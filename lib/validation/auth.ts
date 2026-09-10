import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address.");

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

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialAuthState: AuthActionState = { status: "idle" };

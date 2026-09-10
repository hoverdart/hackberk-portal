import { z } from "zod";

export const reviewRecommendationSchema = z.enum(["accepted", "waitlisted", "rejected"]);
export const scoreSchema = z.coerce.number().int().min(1).max(5);
export const reviewIdSchema = z.string().uuid();

export type ReviewActionState = { status: "idle" | "saved" | "submitted" | "error"; message?: string; errors?: Record<string, string[]> };
export const initialReviewState: ReviewActionState = { status: "idle" };

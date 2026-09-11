import { z } from "zod";

/**
 * Validation for the organizer review form.
 *
 * A reviewer may recommend one of three outcomes — note that this is narrower
 * than `applicationStatuses`. A reviewer recommends; only a final decision, made
 * separately, moves the application. `under_review` and `withdrawn` are therefore
 * not recommendable.
 */
export const reviewRecommendationSchema = z.enum(["accepted", "waitlisted", "rejected"]);

/** Rubric scores are whole numbers 1-5. `coerce` because form bodies are strings. */
export const scoreSchema = z.coerce.number().int().min(1).max(5);

export const reviewIdSchema = z.string().uuid();

export type ReviewActionState = {
  status: "idle" | "saved" | "submitted" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};
export const initialReviewState: ReviewActionState = { status: "idle" };

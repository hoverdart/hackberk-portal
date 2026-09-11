import { z } from "zod";

/**
 * Validation for the organizer review form.
 *
 * An organizer blind review may recommend one of three outcomes — narrower than
 * `applicationStatuses`. The recommendation supports a separately recorded final
 * decision, so `under_review` and `withdrawn` are not recommendable.
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

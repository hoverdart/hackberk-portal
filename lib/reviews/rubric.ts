import { z } from "zod";

/**
 * Rubric parsing and score aggregation.
 *
 * A rubric is stored per event as JSON rather than as columns, so an organizer
 * can change the criteria between events without a migration. The cost of that
 * flexibility is that the JSON is untrusted at read time, which is what
 * `parseRubric` handles.
 */

export type RubricCriterion = { key: string; label: string; weight: number };

// `key` is constrained to a safe identifier shape because it is used to look up
// values in the stored `scores` object; `weight` is a fraction of the total.
const criterionSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  weight: z.number().positive().max(1),
});
const rubricSchema = z.object({
  version: z.number().int().positive(),
  criteria: z.array(criterionSchema).min(1).max(12),
});

/**
 * Returns the criteria, or an empty array if the stored JSON does not match the
 * schema. Failing soft is deliberate: a malformed rubric should render a review
 * page with no criteria rather than crash the organizer's queue.
 */
export function parseRubric(value: unknown): RubricCriterion[] {
  const parsed = rubricSchema.safeParse(value);
  return parsed.success ? parsed.data.criteria : [];
}

/**
 * Average the weighted scores of the *submitted* reviews for one application.
 *
 * Drafts are excluded so a half-finished review never moves the aggregate. The
 * result is null when there is nothing to average yet, which the UI shows as
 * "awaiting reviews" rather than as a score of zero.
 *
 * Dividing by `totalWeight` rather than by the criterion count keeps the result
 * on the same 1-5 scale as the individual scores even when the weights do not
 * sum to exactly 1.
 */
export function aggregateSubmittedReviews(
  reviews: Array<{ status: string; scores: Record<string, number> }>,
  criteria: RubricCriterion[],
) {
  const submitted = reviews.filter((review) => review.status === "submitted");
  if (submitted.length === 0 || criteria.length === 0) return null;
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  // A criterion the organizer did not score contributes 0 rather than breaking the sum.
  const perReview = submitted.map(
    (review) =>
      criteria.reduce((sum, criterion) => sum + (review.scores[criterion.key] ?? 0) * criterion.weight, 0) /
      totalWeight,
  );
  // Two decimal places: enough to break ties, not enough to imply false precision.
  return Math.round((perReview.reduce((sum, score) => sum + score, 0) / perReview.length) * 100) / 100;
}

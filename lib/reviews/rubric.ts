import { z } from "zod";

export type RubricCriterion = { key: string; label: string; weight: number };

const criterionSchema = z.object({ key: z.string().regex(/^[a-z0-9_]+$/), label: z.string().min(1), weight: z.number().positive().max(1) });
const rubricSchema = z.object({ version: z.number().int().positive(), criteria: z.array(criterionSchema).min(1).max(12) });

export function parseRubric(value: unknown): RubricCriterion[] {
  const parsed = rubricSchema.safeParse(value);
  return parsed.success ? parsed.data.criteria : [];
}

export function aggregateSubmittedReviews(reviews: Array<{ status: string; scores: Record<string, number> }>, criteria: RubricCriterion[]) {
  const submitted = reviews.filter((review) => review.status === "submitted");
  if (submitted.length === 0 || criteria.length === 0) return null;
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const perReview = submitted.map((review) => criteria.reduce((sum, criterion) => sum + (review.scores[criterion.key] ?? 0) * criterion.weight, 0) / totalWeight);
  return Math.round((perReview.reduce((sum, score) => sum + score, 0) / perReview.length) * 100) / 100;
}

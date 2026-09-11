import { describe, expect, it } from "vitest";

import { aggregateSubmittedReviews, parseRubric } from "@/lib/reviews/rubric";

const criteria = parseRubric({
  version: 1,
  criteria: [
    { key: "motivation", label: "Motivation", weight: 0.6 },
    { key: "community", label: "Community", weight: 0.4 },
  ],
});

describe("blind-review scoring", () => {
  it("ignores drafts when calculating the organizer aggregate", () => {
    expect(
      aggregateSubmittedReviews([{ status: "draft", scores: { motivation: 5, community: 5 } }], criteria),
    ).toBeNull();
  });

  it("applies rubric weights across submitted independent reviews", () => {
    expect(
      aggregateSubmittedReviews(
        [
          { status: "submitted", scores: { motivation: 5, community: 3 } },
          { status: "submitted", scores: { motivation: 3, community: 4 } },
        ],
        criteria,
      ),
    ).toBe(3.8);
  });

  it("rejects malformed rubric configuration", () => {
    expect(parseRubric({ version: 1, criteria: [{ key: "not valid", label: "Bad", weight: 2 }] })).toEqual([]);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/(organizer)/organizer/actions", () => ({
  saveReviewAction: vi.fn(),
  decideApplicationAction: vi.fn(),
  reportConflictAction: vi.fn(),
}));

import { ReviewWorkspace } from "@/components/organizer/review-workspace";

const base = {
  application: { id: "a1", role: "judge", status: "under_review" },
  eventName: "Herkeley Build 2027",
  answers: [{ section_key: "experience", answers: { judgingExperience: "I judge" } }],
  assignment: { id: "s1", status: "draft", conflict_reason: null },
  review: null,
  criteria: [{ key: "motivation", label: "Motivation", weight: 1 }],
  aggregate: null,
  canDecide: true,
};

/**
 * The reveal rule, from the component's side.
 *
 * An organizer scores what was written, then learns who wrote it and what they
 * need to take part. Both halves are asserted here because the panel renders
 * only when `applicant` is present — so a logistics answer that arrived without
 * a profile row would silently never appear, which is exactly how this surfaced.
 */
describe("review workspace reveal", () => {
  it("shows neither identity nor logistics before a blind review is submitted", () => {
    render(<ReviewWorkspace {...base} submittedReviewCount={0} applicant={null} logisticsAnswers={[]} />);
    expect(screen.queryByText("Who this is, and what they need")).not.toBeInTheDocument();
    expect(screen.getByText(/Who wrote it stays hidden until you submit/)).toBeVisible();
  });

  it("shows identity and the logistics answers once it is", () => {
    render(
      <ReviewWorkspace
        {...base}
        submittedReviewCount={1}
        applicant={{
          full_name: "Alex Chen",
          preferred_name: null,
          school: "UC Herkeley",
          graduation_year: 2028,
          pronouns: "they/them",
        }}
        logisticsAnswers={[
          {
            section_key: "logistics",
            answers: { availability: ["Friday", "Sunday"], accommodations: "Step-free access" },
          },
        ]}
      />,
    );
    expect(screen.getByText("Who this is, and what they need")).toBeVisible();
    expect(screen.getByText("Alex Chen")).toBeVisible();
    expect(screen.getByText("UC Herkeley")).toBeVisible();
    // The reason the panel exists: an organizer has to be able to read this.
    expect(screen.getByText("Friday, Sunday")).toBeVisible();
    expect(screen.getByText("Step-free access")).toBeVisible();
  });
});

describe("review workspace reveal — empty logistics", () => {
  it("says the section was left blank rather than rendering an empty panel", () => {
    render(
      <ReviewWorkspace
        {...base}
        submittedReviewCount={1}
        applicant={{
          full_name: "Alex Chen",
          preferred_name: null,
          school: null,
          graduation_year: null,
          pronouns: null,
        }}
        logisticsAnswers={[]}
      />,
    );
    expect(screen.getByText("This applicant left the logistics section blank.")).toBeVisible();
  });
});

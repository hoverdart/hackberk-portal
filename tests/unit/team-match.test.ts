import { describe, expect, it } from "vitest";

import { rankMatches, type MatchProfile } from "@/lib/team-match/ranking";

const me: MatchProfile = {
  userId: "me",
  skills: ["Frontend"],
  interests: ["Climate", "Accessibility"],
  availability: ["Saturday day"],
  experienceLevel: 2,
};

describe("explainable team matching", () => {
  it("ranks complementary candidates deterministically", () => {
    const results = rankMatches(me, [
      { userId: "b", skills: ["Backend"], interests: ["Climate"], availability: ["Saturday day"], experienceLevel: 3 },
      { userId: "a", skills: ["Frontend"], interests: [], availability: [], experienceLevel: 5 },
    ]);

    expect(results.map((result) => result.userId)).toEqual(["b", "a"]);
    expect(results[0]).toMatchObject({
      score: 13,
      reasons: ["1 shared interest", "1 overlapping time block", "1 complementary skill", "compatible experience pace"],
    });
  });

  it("uses user id as a stable tie breaker and excludes the viewer", () => {
    const tied = ["zeta", "alpha"].map((userId) => ({ ...me, userId, interests: [] }));
    expect(rankMatches(me, [{ ...me }, ...tied]).map((result) => result.userId)).toEqual(["alpha", "zeta"]);
  });
});

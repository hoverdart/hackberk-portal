export type MatchProfile = {
  userId: string;
  skills: string[];
  interests: string[];
  experienceLevel: number;
  availability: string[];
};
export type MatchResult = { userId: string; score: number; reasons: string[] };

/**
 * The Team Match ranker.
 *
 * This is a TypeScript mirror of the SQL ranking function that actually runs in
 * production. Keeping both means the scoring rules and, more importantly, the
 * human-readable explanations can be unit tested without standing up a database
 * — see `tests/unit/team-match.test.ts`. If you change the weights here, change
 * them in the migration too, or the explanation will stop matching the score.
 *
 * The product rule this encodes: a good teammate shares your interests and your
 * availability, brings skills you lack, and works at a similar pace. Weights are
 * ordered to match that sentence.
 */
export function rankMatches(me: MatchProfile, candidates: MatchProfile[]): MatchResult[] {
  return candidates
    .filter((candidate) => candidate.userId !== me.userId)
    .map((candidate) => {
      const sharedInterests = intersection(me.interests, candidate.interests).length;
      const sharedAvailability = intersection(me.availability, candidate.availability).length;
      // Complementary, not shared: skills *they* have that you do not.
      const complementarySkills = candidate.skills.filter((skill) => !me.skills.includes(skill)).length;
      // 5 when the pace matches exactly, falling to 0 as the gap widens.
      const experienceFit = Math.max(0, 5 - Math.abs(candidate.experienceLevel - me.experienceLevel));

      // Every score ships with the reasons that produced it. A match a hacker cannot
      // explain is a match they will not trust, so this array is a product
      // requirement rather than debug output.
      const reasons = [
        sharedInterests ? `${sharedInterests} shared interest${sharedInterests === 1 ? "" : "s"}` : "",
        sharedAvailability ? `${sharedAvailability} overlapping time block${sharedAvailability === 1 ? "" : "s"}` : "",
        complementarySkills ? `${complementarySkills} complementary skill${complementarySkills === 1 ? "" : "s"}` : "",
        experienceFit >= 4 ? "compatible experience pace" : "",
      ].filter(Boolean);

      // `Math.min(complementarySkills, 4)` caps the skill term so someone who lists
      // twenty skills cannot dominate the ranking on breadth alone.
      return {
        userId: candidate.userId,
        score: sharedInterests * 4 + sharedAvailability * 3 + Math.min(complementarySkills, 4) * 2 + experienceFit,
        reasons,
      };
      // Ties break on user id so the order is deterministic across renders — an
      // unstable list would reshuffle under the reader every time the page reloads.
    })
    .sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId));
}

/** Set intersection, de-duplicating the left side first so repeats cannot inflate a count. */
function intersection(left: string[], right: string[]) {
  return [...new Set(left)].filter((item) => right.includes(item));
}

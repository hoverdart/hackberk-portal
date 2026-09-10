export type MatchProfile = { userId: string; skills: string[]; interests: string[]; experienceLevel: number; availability: string[] };
export type MatchResult = { userId: string; score: number; reasons: string[] };

/** Mirrors the SQL ranker so explanation copy can be unit tested without a database. */
export function rankMatches(me: MatchProfile, candidates: MatchProfile[]): MatchResult[] {
  return candidates.filter((candidate) => candidate.userId !== me.userId).map((candidate) => {
    const sharedInterests = intersection(me.interests, candidate.interests).length;
    const sharedAvailability = intersection(me.availability, candidate.availability).length;
    const complementarySkills = candidate.skills.filter((skill) => !me.skills.includes(skill)).length;
    const experienceFit = Math.max(0, 5 - Math.abs(candidate.experienceLevel - me.experienceLevel));
    const reasons = [sharedInterests ? `${sharedInterests} shared interest${sharedInterests === 1 ? "" : "s"}` : "", sharedAvailability ? `${sharedAvailability} overlapping time block${sharedAvailability === 1 ? "" : "s"}` : "", complementarySkills ? `${complementarySkills} complementary skill${complementarySkills === 1 ? "" : "s"}` : "", experienceFit >= 4 ? "compatible experience pace" : ""].filter(Boolean);
    return { userId: candidate.userId, score: sharedInterests * 4 + sharedAvailability * 3 + Math.min(complementarySkills, 4) * 2 + experienceFit, reasons };
  }).sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId));
}

function intersection(left: string[], right: string[]) { return [...new Set(left)].filter((item) => right.includes(item)); }

export const applicationRoles = ["hacker", "judge", "mentor", "volunteer"] as const;
export type ApplicationRole = (typeof applicationRoles)[number];
export const applicationStatuses = ["draft", "submitted", "under_review", "accepted", "waitlisted", "rejected", "withdrawn"] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];
export type ApplicationSummary = { id: string | null; role: ApplicationRole; status: ApplicationStatus | "not_started"; progress: number };

export const roleCopy: Record<ApplicationRole, { words: [string, string, string]; tagline: string }> = {
  hacker: { words: ["BUILD", "LEARN", "COLLABORATE"], tagline: "Make an idea real." },
  judge: { words: ["EVALUATE", "SUPPORT", "GIVE BACK"], tagline: "Help spot great ideas." },
  mentor: { words: ["SHARE", "GUIDE", "EMPOWER"], tagline: "Guide builders forward." },
  volunteer: { words: ["MAKE", "IT HAPPEN", "TOGETHER"], tagline: "Power the experience." },
};

export function statusLabel(status: ApplicationSummary["status"]) {
  return status === "not_started" ? "Not started" : status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

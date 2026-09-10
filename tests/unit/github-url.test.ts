import { describe, expect, it } from "vitest";

import { githubRepositoryUrlSchema } from "@/lib/github/url";

describe("Project Lens repository boundaries", () => {
  it("canonicalizes a public GitHub repository URL", () => {
    expect(githubRepositoryUrlSchema.parse("https://github.com/hackberkeley/portal.git")).toEqual({
      owner: "hackberkeley",
      repo: "portal",
      canonicalUrl: "https://github.com/hackberkeley/portal",
    });
  });

  it.each([
    "http://github.com/hackberkeley/portal",
    "https://github.example.com/hackberkeley/portal",
    "https://github.com/hackberkeley/portal/issues",
    "https://user:secret@github.com/hackberkeley/portal",
  ])("rejects non-repository or credential-bearing input: %s", (url) => {
    expect(githubRepositoryUrlSchema.safeParse(url).success).toBe(false);
  });
});

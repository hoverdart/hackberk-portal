import { describe, expect, it } from "vitest";

import { completionForAnswers, getApplicationDefinition, schemaForSection } from "@/lib/applications/definitions";
import { applicationRoles } from "@/lib/domain/applications";

describe("application form definitions", () => {
  it.each(applicationRoles)("gives %s a shared identity/logistics flow and unique experience questions", (role) => {
    const sections = getApplicationDefinition(role);
    expect(sections.map((section) => section.key)).toEqual(["profile", "experience", "logistics"]);
    expect(sections[0].identitySensitive).toBe(true);
    expect(sections[1].identitySensitive).toBe(false);
  });

  it("validates required multi-selects and full portfolio URLs", () => {
    const profile = getApplicationDefinition("hacker")[0];
    expect(schemaForSection(profile).safeParse({ school: "UC Berkeley", graduationYear: "2027", portfolioUrl: "portfolio.test" }).success).toBe(false);
    expect(schemaForSection(profile).safeParse({ school: "UC Berkeley", graduationYear: "2027", portfolioUrl: "https://portfolio.test" }).success).toBe(true);
  });

  it("computes progress from valid complete sections", () => {
    expect(completionForAnswers("hacker", { profile: { school: "UC Berkeley", graduationYear: 2027, portfolioUrl: "" } })).toBe(33);
  });
});

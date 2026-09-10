import { describe, expect, it } from "vitest";

import { applicationRoles, statusLabel } from "@/lib/domain/applications";

describe("application domain", () => {
  it("keeps every supported role available to one account", () => {
    expect(applicationRoles).toEqual(["hacker", "judge", "mentor", "volunteer"]);
  });

  it("presents machine statuses as human labels", () => {
    expect(statusLabel("under_review")).toBe("Under review");
    expect(statusLabel("not_started")).toBe("Not started");
  });
});

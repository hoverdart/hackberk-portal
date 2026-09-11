import { describe, expect, it } from "vitest";

import { signUpSchema } from "@/lib/validation/auth";

describe("signUpSchema", () => {
  it("accepts a strong, valid account payload", () => {
    expect(
      signUpSchema.safeParse({ fullName: "Alex Chen", email: "alex@example.com", password: "runbook2027" }).success,
    ).toBe(true);
  });

  it("accepts only the two intentional account types", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Alex Chen",
        email: "alex@example.com",
        password: "runbook2027",
        accountType: "organizer",
      }).success,
    ).toBe(true);
    expect(
      signUpSchema.safeParse({
        fullName: "Alex Chen",
        email: "alex@example.com",
        password: "runbook2027",
        accountType: "admin",
      }).success,
    ).toBe(false);
  });

  it("returns field-level recovery guidance", () => {
    const result = signUpSchema.safeParse({ fullName: "A", email: "not-an-email", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(Object.keys(result.error.flatten().fieldErrors)).toEqual(["fullName", "email", "password"]);
  });
});

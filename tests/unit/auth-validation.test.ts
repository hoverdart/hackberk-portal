import { describe, expect, it } from "vitest";

import { signUpSchema } from "@/lib/validation/auth";

describe("signUpSchema", () => {
  it("accepts a strong, valid account payload", () => {
    expect(signUpSchema.safeParse({ fullName: "Alex Chen", email: "alex@example.com", password: "runbook2027" }).success).toBe(true);
  });

  it("returns field-level recovery guidance", () => {
    const result = signUpSchema.safeParse({ fullName: "A", email: "not-an-email", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.error.flatten().fieldErrors)).toEqual(["fullName", "email", "password"]);
  });
});

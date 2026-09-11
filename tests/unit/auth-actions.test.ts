import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  rpc: vi.fn(),
  signUp: vi.fn(),
}));

function signUpForm(accountType: "applicant" | "organizer" = "applicant") {
  const formData = new FormData();
  formData.set("fullName", "Alex Chen");
  formData.set("email", "alex@example.com");
  formData.set("password", "runbook2027");
  formData.set("accountType", accountType);
  return formData;
}

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signUp: mocks.signUp }, rpc: mocks.rpc })),
}));

import { signUpAction } from "@/app/(public)/auth-actions";

describe("signUpAction", () => {
  beforeEach(() => {
    mocks.redirect.mockReset();
    mocks.rpc.mockReset();
    mocks.signUp.mockReset();
  });

  it("opens the dashboard immediately when Supabase creates a session", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: "session" } }, error: null });

    await signUpAction({ status: "idle" }, signUpForm());

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "runbook2027",
      options: { data: { full_name: "Alex Chen" } },
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("does not promise access if Auth unexpectedly returns no session", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });

    const result = await signUpAction({ status: "idle" }, signUpForm());

    expect(result).toEqual({
      status: "error",
      message: "Your account was created, but we could not open a session. Please sign in.",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("claims the synthetic-event organizer membership and opens the organizer queue", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: "session" } }, error: null });
    mocks.rpc.mockResolvedValue({ error: null });

    await signUpAction({ status: "idle" }, signUpForm("organizer"));

    expect(mocks.rpc).toHaveBeenCalledWith("claim_test_organizer_membership");
    expect(mocks.redirect).toHaveBeenCalledWith("/organizer/applications");
  });
});

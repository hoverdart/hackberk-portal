import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationWorkspace } from "@/components/applications/application-workspace";
import { saveApplicationSectionAction } from "@/app/(app)/(portal)/applications/actions";
import { getApplicationDefinition } from "@/lib/applications/definitions";
import { applicationRoles, type ApplicationRole, type ApplicationStatus } from "@/lib/domain/applications";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/(portal)/applications/actions", () => ({
  saveApplicationSectionAction: vi.fn(async () => ({ status: "saved", message: "Draft saved", answerVersion: 1 })),
  submitApplicationAction: vi.fn(),
  withdrawApplicationAction: vi.fn(),
}));

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function renderWorkspace(
  role: ApplicationRole,
  status: ApplicationStatus = "draft",
  progress = 0,
  answers: Record<string, Record<string, unknown>> = {},
) {
  return render(
    <ApplicationWorkspace
      application={{
        id: "00000000-0000-4000-8000-000000000001",
        role,
        status,
        progress,
        answers,
        answerVersions: {},
      }}
      eventName="Herkeley Build 2027"
      sections={getApplicationDefinition(role)}
    />,
  );
}

describe("application workspace", () => {
  it.each(applicationRoles)("renders %s as a usable three-step form", async (role) => {
    const user = userEvent.setup();
    renderWorkspace(role);

    expect(screen.getByRole("navigation", { name: "Application sections" })).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Application completion" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("heading", { name: "Profile" })).toBeVisible();
    expect(screen.getByLabelText("School or organization")).toBeVisible();
    expect(screen.getByText("Identity-sensitive — excluded from blind review")).toBeVisible();

    await user.click(screen.getByRole("button", { name: new RegExp(getApplicationDefinition(role)[1].title) }));
    expect(await screen.findByRole("heading", { name: getApplicationDefinition(role)[1].title })).toBeVisible();
    expect(screen.getByText("Included in blind review without your identity")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next section" })).toBeVisible();
  });

  it("allows an incomplete draft to be saved and keeps its editor mounted across a quick step change", async () => {
    const user = userEvent.setup();
    const { container } = renderWorkspace("hacker");
    const profileForm = screen.getByLabelText("School or organization").closest("form");
    expect(profileForm).toHaveAttribute("novalidate");

    await user.type(screen.getByLabelText("School or organization"), "Berkeley");
    await user.click(screen.getByRole("button", { name: "Next section" }));

    await screen.findByRole("heading", { name: "Builder story" });
    expect(profileForm).toHaveAttribute("hidden");
    expect(container.querySelectorAll("form.section-form")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Builder story" })).toBeVisible();
  });

  it("keeps typing in local storage until an explicit save or section change", async () => {
    const user = userEvent.setup();
    renderWorkspace("hacker");

    await user.type(screen.getByLabelText("School or organization"), "Berkeley");

    expect(
      window.localStorage.getItem("backathons:application-draft:00000000-0000-4000-8000-000000000001:profile"),
    ).toContain("Berkeley");
    expect(saveApplicationSectionAction).not.toHaveBeenCalled();
  });

  it("guards terminal actions and makes withdrawal a keyboard-dismissible confirmation", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWorkspace("hacker", "submitted");

    await user.click(screen.getByRole("button", { name: /Logistics/ }));
    const withdraw = screen.getByRole("button", { name: "Withdraw application" });
    await user.click(withdraw);
    expect(screen.getByRole("dialog", { name: "Withdraw this application?" })).toBeVisible();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(withdraw).toHaveFocus();

    rerender(
      <ApplicationWorkspace
        application={{
          id: "00000000-0000-4000-8000-000000000001",
          role: "hacker",
          status: "rejected",
          progress: 100,
          answers: {},
          answerVersions: {},
        }}
        eventName="Herkeley Build 2027"
        sections={getApplicationDefinition("hacker")}
      />,
    );
    expect(screen.queryByRole("button", { name: "Withdraw application" })).not.toBeInTheDocument();
    expect(screen.getByText(/cannot be changed here/i)).toBeVisible();
  });

  /**
   * A locked application reports its answers, not an empty form.
   *
   * Completion used to be read through `new FormData(form)`, which omits
   * disabled controls by specification. A submitted or decided application
   * renders its whole fieldset disabled, so every field came back empty: an
   * accepted applicant was shown "0% complete" and "Needs answers" on every
   * section, directly above the answers they had given.
   */
  it.each(["submitted", "accepted"] as const)(
    "shows a %s application its outcome rather than an empty progress meter",
    async (status) => {
      const completeAnswers = {
        profile: { school: "UC Herkeley", graduationYear: 2028, portfolioUrl: "https://example.com/" },
        experience: {
          skills: ["Web"],
          motivation: "A sentence that is comfortably long enough to satisfy the schema.",
          projectInterest: "Something I have wanted to build for a while now.",
        },
        logistics: { availability: ["Friday"] },
      };
      renderWorkspace("hacker", status, 100, completeAnswers);

      expect(screen.queryByRole("progressbar", { name: "Application completion" })).not.toBeInTheDocument();
      expect(screen.queryByText("0% complete")).not.toBeInTheDocument();
      expect(screen.queryByText("Needs answers")).not.toBeInTheDocument();
      expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
      // The answers are still on screen, read-only.
      expect(screen.getByLabelText("School or organization")).toHaveValue("UC Herkeley");
      expect(screen.getByLabelText("School or organization")).toBeDisabled();
      // Nothing offers to save an application that cannot change.
      expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
    },
  );
});

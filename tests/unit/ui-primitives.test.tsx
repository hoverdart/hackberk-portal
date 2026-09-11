import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  // jsdom does not expose the browser View Transition API. The dashboard's
  // motion wrapper is transparent to its rendered application state.
  return { ...actual, ViewTransition: ({ children }: { children: ReactNode }) => children };
});

import { ActionFeed } from "@/components/ops/action-feed";
import { PortalShell } from "@/components/shell/portal-shell";
import { StatusStamp } from "@/components/ui/status-stamp";

describe("reusable portal primitives", () => {
  it("turns state-machine values into readable status stamps", () => {
    render(<StatusStamp status="under_review" />);
    expect(screen.getByText("Under review")).toHaveClass("status-stamp--under_review");
  });

  it("uses one semantic ordered feed for linked and completed work", () => {
    render(
      <ActionFeed
        label="JUDGE"
        title="Queue"
        empty="Nothing assigned."
        items={[
          {
            id: "1",
            title: "Project Atlas",
            detail: "Review the submitted build.",
            href: "/projects/1",
            meta: "Assigned",
            done: true,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Queue" })).toBeVisible();
    expect(screen.getByRole("list")).toBeVisible();
    expect(screen.getByRole("link", { name: /Open/ })).toHaveAttribute("href", "/projects/1");
  });

  it("announces a useful empty state", () => {
    render(<ActionFeed label="MENTOR" title="Help desk" empty="No teams are waiting." items={[]} />);
    expect(screen.getByText("All clear.")).toBeVisible();
    expect(screen.getByText("No teams are waiting.")).toBeVisible();
  });

  it("labels submitted applications as view-only and carries completion into queued progress", () => {
    render(
      <PortalShell
        profileName="Ari"
        event={{
          name: "Herkeley Build 2027",
          venue: "Herkeley · Pauley Ballroom",
          startsAt: "2027-03-06T17:00:00-08:00",
          closesAt: "2027-03-06T23:59:00-08:00",
          synthetic: true,
        }}
        applications={[
          {
            id: "hacker",
            role: "hacker",
            status: "submitted",
            progress: 100,
            sections: [],
          },
          {
            id: "judge",
            role: "judge",
            status: "submitted",
            progress: 100,
            sections: [],
          },
          { id: null, role: "mentor", status: "not_started", progress: 0, sections: [] },
          { id: null, role: "volunteer", status: "not_started", progress: 0, sections: [] },
        ]}
      />,
    );

    expect(screen.getAllByRole("link", { name: "View submitted application" })).toHaveLength(2);
    expect(screen.getByLabelText("100% complete")).toHaveStyle("--progress: 100%");
    expect(screen.getByText("Mar 6, 11:59 PM PT")).toBeVisible();
  });
});

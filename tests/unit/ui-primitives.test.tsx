import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActionFeed } from "@/components/ops/action-feed";
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
});

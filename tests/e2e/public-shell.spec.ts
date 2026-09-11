import { expect, test } from "@playwright/test";

test("public application entry points remain usable", async ({ page }) => {
  await page.goto("/");
  // Asserts the hero renders and names the event, not one exact sentence. This
  // test is about the entry points staying usable; pinning the headline verbatim
  // made it fail every time the marketing copy was reworded.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Herkeley");
  await page.getByRole("link", { name: "Start an application" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeEditable();
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
});

test("Portal fixture keeps the role deck and every real destination usable", async ({ page }) => {
  await page.goto("/design/hero");

  // The binder is the design: four role tabs, the active sheet, and the queued
  // sheets behind it. Asserting these keeps a future "simplification" from
  // quietly flattening the dashboard again.
  for (const role of ["hacker", "judge", "mentor", "volunteer"]) {
    await expect(page.getByRole("tab", { name: new RegExp(role, "i") })).toBeVisible();
  }
  // The selected role leads the deck, whichever role it is.
  await expect(page.getByRole("tab", { selected: true })).toHaveCount(1);
  await expect(page.locator(".role-tab").first()).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".active-sheet")).toBeVisible();
  await expect(page.locator(".queued-sheet")).toHaveCount(3);

  // The checklist is the real section list for the role, not a fixed four rows.
  await expect(page.locator(".checklist-row")).toHaveCount(3);
  await expect(page.locator(".progress-seal")).toContainText("33%");

  // Every rail destination is a route that exists, and the ones that lied are gone.
  for (const destination of ["Applications", "Event", "Teams", "Projects", "Profile"]) {
    await expect(page.getByRole("link", { name: destination, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Messages", exact: true })).toHaveCount(0);
  await expect(page.getByRole("searchbox")).toHaveCount(0);

  // The rail is the only chrome: no second bar, and none of the decorative
  // plates that used to sit on top of the content.
  await expect(page.locator(".runbook-topbar, .role-mascot, .queued-notes")).toHaveCount(0);

  // No demo-scaffolding chrome on a surface an applicant sees.
  await expect(page.locator(".synthetic-label")).toHaveCount(0);
  await expect(page.getByText(/synthetic/i)).toHaveCount(0);

  await expect(page.locator("body")).toHaveCSS("overflow-x", "visible");
});

test("selecting a role deals its sheet to the front of the deck", async ({ page }) => {
  await page.goto("/design/hero");
  await expect(page.locator(".role-tab").first()).toContainText(/hacker/i);

  await page.getByRole("tab", { name: /volunteer/i }).click();

  // The chosen role leads the deck, is the selected tab, and owns the active
  // sheet. DOM order is visual order, so this also fixes the tab sequence for
  // anyone navigating by keyboard.
  await expect(page).toHaveURL(/role=volunteer/);
  await expect(page.locator(".role-tab").first()).toContainText(/volunteer/i);
  await expect(page.locator(".role-tab").first()).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".active-sheet h2")).toContainText(/volunteer/i);
  await expect(page.locator(".queued-sheet")).toHaveCount(3);

  // Every tab seats on the same line, so none floats above a gap. Only the
  // layered desktop deck makes this claim; the phone layout stacks instead.
  const isDeck = await page.evaluate(() => window.matchMedia("(min-width: 951px)").matches);
  if (isDeck) {
    // The cursor is left sitting over whichever tab took the clicked one's old
    // slot, and hovering lifts a tab 2px. Park it away before measuring.
    await page.mouse.move(0, 0);
    // Hovering lifts a tab by 2px, so park the cursor before measuring
    // rather than sampling a single frame mid-animation.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Set(
              [...document.querySelectorAll(".role-tab")].map((tab) => Math.round(tab.getBoundingClientRect().bottom)),
            ).size,
        ),
      )
      .toBe(1);
  }
});

test("protected applicant and organizer routes redirect anonymous visitors", async ({ page }) => {
  for (const route of [
    "/applications/hacker",
    "/teams",
    "/projects",
    "/ops",
    "/profile",
    "/organizer/applications",
    "/organizer/operations",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=${encodeURIComponent(route)}`));
  }
});

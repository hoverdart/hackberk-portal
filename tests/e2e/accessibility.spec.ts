import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

/**
 * Wait for every running animation to settle.
 *
 * Each surface plays a short arrival sequence, so for the first second or so the
 * page is mid-fade and its text is composited at partial opacity. Auditing colour
 * contrast on one of those frames measures a state no user reads and reports the
 * whole page as failing. Audit the settled UI instead.
 */
async function settle(page: import("@playwright/test").Page) {
  await page
    .waitForFunction(
      () => document.getAnimations().every((animation) => animation.playState === "finished" || animation.playState === "idle"),
      undefined,
      { timeout: 5_000 },
    )
    // A surface with a deliberate looping animation would never settle; fall
    // through rather than failing the accessibility check for it.
    .catch(() => {});
}

test("public and portal surfaces have no serious axe violations", async ({ page }) => {
  for (const route of ["/", "/design/hero"]) {
    await page.goto(route);
    await settle(page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  }
});

test("primary navigation works from the keyboard", async ({ page }) => {
  await page.goto("/");
  const entry = page.getByRole("link", { name: "Start an application" });
  await entry.focus();
  await expect(entry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/sign-up$/);
});

test("reduced-motion users receive near-instant transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const duration = await page.getByRole("link", { name: "Start an application" }).evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
  expect(duration).toBeLessThan(0.02);
});

test("captures the required review viewport", async ({ page }, testInfo) => {
  await page.goto("/design/hero");
  await page.screenshot({
    path: path.join(process.cwd(), ".impeccable", "review", `${testInfo.project.name}.png`),
    fullPage: true,
  });
});

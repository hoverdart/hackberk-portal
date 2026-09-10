import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

test("public and portal surfaces have no serious axe violations", async ({ page }) => {
  for (const route of ["/", "/design/hero"]) {
    await page.goto(route);
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

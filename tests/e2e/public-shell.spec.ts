import { expect, test } from "@playwright/test";

test("public application entry points remain usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your whole hackathon, in one runbook." })).toBeVisible();
  await page.getByRole("link", { name: "Start an application" }).click();
  await expect(page.getByRole("heading", { name: "Get your credentials" })).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeEditable();
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
});

test("Run of Show fixture exposes all four role tabs", async ({ page }) => {
  await page.goto("/design/hero");
  await expect(page.getByRole("heading", { name: /Hacker application/ })).toBeVisible();
  for (const role of ["hacker", "judge", "mentor", "volunteer"]) {
    await expect(page.getByRole("tab", { name: new RegExp(role, "i") })).toBeVisible();
  }
  await expect(page.locator("body")).toHaveCSS("overflow-x", "visible");
});

test("protected applicant and organizer routes redirect anonymous visitors", async ({ page }) => {
  await page.goto("/applications/hacker");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapplications%2Fhacker/);
  await page.goto("/organizer/applications");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Forganizer%2Fapplications/);
});

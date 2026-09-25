import { test, expect } from "@playwright/test";

test("loads the study app at the configured base path", async ({ page }) => {
  await page.goto("./");

  await expect(
    page.getByRole("heading", { name: "ATA Legacy Study App" }),
  ).toBeVisible();

  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Configure session" }),
  ).toHaveAttribute("href", "#/configure");
});
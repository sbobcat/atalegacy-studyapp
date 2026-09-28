import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

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

  const footer = page.getByRole("contentinfo");
  await expect(footer).toBeVisible();
  await expect(footer).toContainText(`Version ${version.split(".").slice(0, 2).join(".")}`);
  const updateDate = await footer.locator("time").getAttribute("datetime");
  expect(updateDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await expect(footer).toContainText(`Last updated: ${updateDate}`);

  await page.getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Configure session" }).click();
  await expect(footer).toBeVisible();
  await page.reload();
  await expect(footer.locator("time")).toHaveAttribute("datetime", updateDate!);
});

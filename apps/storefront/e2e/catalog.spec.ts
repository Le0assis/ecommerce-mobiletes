import { expect, test } from "@playwright/test";

test("o filtro de marca mostra a linha parceira e a legislação nomeia o enquadramento", async ({ page }) => {
  await page.goto("/motos?marca=VOLTIS");
  await expect(page.getByRole("heading", { name: "VOLTIS Pico" })).toBeVisible();
  await page.goto("/legislacao");
  await expect(page.getByRole("heading", { name: "Autopropelido" })).toBeVisible();
});

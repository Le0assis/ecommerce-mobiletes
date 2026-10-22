import { expect, test } from "@playwright/test";

test("a home vende em 21 vezes e no Pix, e o configurador muda o preço", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-title")).toContainText("silêncio");
  await expect(page.getByTestId("installment-price")).toContainText("21");
  await expect(page.getByTestId("pix-price")).toContainText("PIX");

  await page.goto("/motos/apex");
  await page.locator("html[data-configurator=ready]").waitFor();
  const before = await page.getByTestId("live-price").innerText();
  await page.getByTestId("color-cobre").click();
  await expect(page.getByTestId("live-price")).toContainText("64.700,00");
  await expect(page.getByTestId("live-price")).not.toHaveText(before);

  await page.getByTestId("reserve").click();
  await expect(page).toHaveURL(/\/checkout/);
});

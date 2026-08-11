import { expect, test } from "@playwright/test";

test("health check - homepage loads", async ({ page }) => {
	const response = await page.goto("/");
	expect(response?.status()).toBe(200);
	await expect(page.locator("body")).toContainText("Statli");
});

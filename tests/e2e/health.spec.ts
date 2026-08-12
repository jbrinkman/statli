import { expect, test } from "@playwright/test";

test("health check - homepage redirects to login", async ({ page }) => {
	const response = await page.goto("/");
	expect(response?.status()).toBe(200);
	await expect(page).toHaveURL(/\/login/);
});

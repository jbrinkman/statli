import { expect, test } from "@playwright/test";

test.describe("auth flow", () => {
	test("navigate to / redirects to /login", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveURL(/\/login/);
	});

	test("login page renders form", async ({ page }) => {
		await page.goto("/login");
		await expect(page.locator("input#email")).toBeVisible();
		await expect(page.locator("input#password")).toBeVisible();
		await expect(page.locator("button[type=submit]")).toBeVisible();
	});

	test("register page renders form", async ({ page }) => {
		await page.goto("/register");
		await expect(page.locator("input#email")).toBeVisible();
		await expect(page.locator("input#password")).toBeVisible();
		await expect(page.locator("input#confirm")).toBeVisible();
	});

	test("access /dashboard without session redirects to login", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page).toHaveURL(/\/login/);
	});
});

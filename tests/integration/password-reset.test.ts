import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("password reset flow", () => {
	let db: InstanceType<typeof Database>;
	let auth: ReturnType<typeof betterAuth>;

	beforeAll(async () => {
		db = new Database(":memory:");
		auth = betterAuth({
			database: db,
			secret: "a-test-secret-that-is-at-least-32-chars-long",
			emailAndPassword: {
				enabled: true,
				sendResetPassword: () => {
					// No-op in tests (no actual email sent)
				},
			},
			basePath: "/api/auth",
		});

		const { runMigrations } = await getMigrations({ ...auth.options, database: db });
		await runMigrations();

		// Create test user
		await auth.handler(
			new Request("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "test@example.com",
					password: "originalpass123",
					name: "Test",
				}),
			}),
		);
	});

	afterAll(() => {
		db.close();
	});

	it("sendResetPassword hook is configured", () => {
		expect(auth.options.emailAndPassword?.sendResetPassword).toBeDefined();
	});

	it("forgetPassword endpoint accepts a request", async () => {
		const res = await auth.handler(
			new Request("http://localhost/api/auth/request-password-reset", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "test@example.com",
					redirectTo: "/reset-password",
				}),
			}),
		);
		// Should succeed (200) even if email doesn't send in test
		expect(res.status).toBe(200);
	});

	it("resetPassword endpoint rejects invalid token", async () => {
		const res = await auth.handler(
			new Request("http://localhost/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: "invalid-token-that-doesnt-exist",
					newPassword: "newpass12345",
				}),
			}),
		);
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	it("changePassword requires authentication", async () => {
		const res = await auth.handler(
			new Request("http://localhost/api/auth/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					currentPassword: "originalpass123",
					newPassword: "newpass12345",
				}),
			}),
		);
		// No session cookie, should be unauthorized
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	it("changePassword rejects wrong current password (with session)", async () => {
		// Sign in to get session
		const signIn = await auth.handler(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "test@example.com", password: "originalpass123" }),
			}),
		);
		const cookies = signIn.headers.getSetCookie();
		const cookieHeader = cookies.join("; ");

		const res = await auth.handler(
			new Request("http://localhost/api/auth/change-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: cookieHeader,
				},
				body: JSON.stringify({
					currentPassword: "wrongpassword",
					newPassword: "newpass12345",
				}),
			}),
		);
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	it("changePassword succeeds with correct current password", async () => {
		// Sign in to get session
		const signIn = await auth.handler(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "test@example.com", password: "originalpass123" }),
			}),
		);
		const cookies = signIn.headers.getSetCookie();
		const cookieHeader = cookies.join("; ");

		const res = await auth.handler(
			new Request("http://localhost/api/auth/change-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: cookieHeader,
				},
				body: JSON.stringify({
					currentPassword: "originalpass123",
					newPassword: "updatedpass456",
				}),
			}),
		);
		expect(res.status).toBe(200);

		// Verify new password works
		const loginWithNew = await auth.handler(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "test@example.com", password: "updatedpass456" }),
			}),
		);
		expect(loginWithNew.status).toBe(200);
	});
});

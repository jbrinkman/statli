import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { getMigrations } from "better-auth/db/migration";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("password reset", () => {
	let db: InstanceType<typeof Database>;
	let auth: ReturnType<typeof betterAuth>;

	beforeAll(async () => {
		db = new Database(":memory:");
		auth = betterAuth({
			database: db,
			secret: "a-test-secret-that-is-at-least-32-chars-long",
			emailAndPassword: { enabled: true },
			basePath: "/api/auth",
		});

		const { runMigrations } = await getMigrations({ ...auth.options, database: db });
		await runMigrations();

		// Create a test user
		await auth.handler(
			new Request("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "test@example.com",
					password: "originalpassword123",
					name: "Test",
				}),
			}),
		);
	});

	afterAll(() => {
		db.close();
	});

	it("hashPassword produces a valid hash", async () => {
		const hash = await hashPassword("mypassword123");
		expect(hash).toBeDefined();
		expect(hash.length).toBeGreaterThan(20);
	});

	it("verifyPassword validates against hash", async () => {
		const hash = await hashPassword("testpass12345");
		const valid = await verifyPassword({ password: "testpass12345", hash });
		expect(valid).toBe(true);
	});

	it("verifyPassword rejects wrong password", async () => {
		const hash = await hashPassword("correctpassword");
		const valid = await verifyPassword({ password: "wrongpassword", hash });
		expect(valid).toBe(false);
	});

	it("password can be updated in place and user can sign in with new password", async () => {
		// Get user ID
		const user = db.prepare("SELECT id FROM user WHERE email = ?").get("test@example.com") as {
			id: string;
		};
		expect(user).toBeDefined();

		// Hash new password and update
		const newHash = await hashPassword("newpassword456");
		db.prepare(
			"UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'",
		).run(newHash, user.id);

		// Verify old password no longer works
		const oldAttempt = await auth.handler(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "test@example.com", password: "originalpassword123" }),
			}),
		);
		expect(oldAttempt.status).toBe(401);

		// Verify new password works
		const newAttempt = await auth.handler(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "test@example.com", password: "newpassword456" }),
			}),
		);
		expect(newAttempt.status).toBe(200);
	});

	it("user ID is preserved after password update", async () => {
		const userBefore = db
			.prepare("SELECT id FROM user WHERE email = ?")
			.get("test@example.com") as { id: string };
		const newHash = await hashPassword("anotherpassword789");
		db.prepare(
			"UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'",
		).run(newHash, userBefore.id);
		const userAfter = db.prepare("SELECT id FROM user WHERE email = ?").get("test@example.com") as {
			id: string;
		};
		expect(userAfter.id).toBe(userBefore.id);
	});
});

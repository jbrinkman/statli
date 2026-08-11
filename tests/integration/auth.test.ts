import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("auth", () => {
	let auth: ReturnType<typeof betterAuth>;
	let db: InstanceType<typeof Database>;

	beforeAll(async () => {
		db = new Database(":memory:");
		auth = betterAuth({
			database: db,
			secret: "a-test-secret-that-is-at-least-32-chars-long",
			emailAndPassword: { enabled: true },
			basePath: "/api/auth",
		});

		const { runMigrations } = await getMigrations({
			...auth.options,
			database: db,
		});
		await runMigrations();
	});

	afterAll(() => {
		db.close();
	});

	it("signup creates user", async () => {
		const response = await auth.handler(
			new Request("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "test@example.com",
					password: "securepassword123",
					name: "Test User",
				}),
			}),
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.user).toBeDefined();
		expect(body.user.email).toBe("test@example.com");
	});

	it("login returns session", async () => {
		const response = await auth.handler(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "test@example.com",
					password: "securepassword123",
				}),
			}),
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.session || body.token || body.user).toBeDefined();
	});

	it("invalid credentials rejected", async () => {
		const response = await auth.handler(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "test@example.com",
					password: "wrongpassword",
				}),
			}),
		);
		expect(response.status).toBe(401);
	});
});

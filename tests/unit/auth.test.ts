import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We need to test getAuth in isolation, so we'll dynamically import after setting env
describe("auth module", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
		// Set required env vars
		process.env.AUTH_SECRET = "a-test-secret-that-is-definitely-at-least-32-characters-long";
		process.env.DATABASE_URL = ":memory:";
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("getAuth throws when AUTH_SECRET is missing", async () => {
		process.env.AUTH_SECRET = "";
		// loadEnvFile() may have already loaded from .env at import time,
		// but getAuth() checks process.env.AUTH_SECRET directly
		const { getAuth } = await import("../../src/lib/auth.js");
		// Clear it after import (loadEnvFile may have set it)
		process.env.AUTH_SECRET = "";
		expect(() => getAuth()).toThrow("AUTH_SECRET must be set and at least 32 characters");
	});

	it("getAuth throws when AUTH_SECRET is too short", async () => {
		process.env.AUTH_SECRET = "short";
		const { getAuth } = await import("../../src/lib/auth.js");
		process.env.AUTH_SECRET = "short";
		expect(() => getAuth()).toThrow("AUTH_SECRET must be set and at least 32 characters");
	});

	it("getAuth returns auth instance with valid config", async () => {
		const { getAuth } = await import("../../src/lib/auth.js");
		const auth = getAuth();
		expect(auth).toBeDefined();
		expect(auth.handler).toBeDefined();
		expect(auth.api).toBeDefined();
	});

	it("getAuth returns same instance on repeated calls (singleton)", async () => {
		const { getAuth } = await import("../../src/lib/auth.js");
		const first = getAuth();
		const second = getAuth();
		expect(first).toBe(second);
	});

	it("auth proxy object delegates to getAuth", async () => {
		const { auth } = await import("../../src/lib/auth.js");
		expect(auth.api).toBeDefined();
		expect(typeof auth.handler).toBe("function");
	});
});

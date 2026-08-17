import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateEnvironment } from "../../src/lib/startup.js";

describe("startup validation", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
		// Set all required vars by default
		process.env.AUTH_SECRET = "a-valid-secret-that-is-definitely-32-chars-long!!";
		process.env.RESEND_API_KEY = "re_test_key";
		process.env.RESEND_FROM_EMAIL = "test@example.com";
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("throws when AUTH_SECRET is missing", () => {
		process.env.AUTH_SECRET = undefined;
		expect(() => validateEnvironment()).toThrow("AUTH_SECRET environment variable is required");
	});

	it("throws when AUTH_SECRET is too short", () => {
		process.env.AUTH_SECRET = "too-short";
		expect(() => validateEnvironment()).toThrow("AUTH_SECRET must be at least 32 characters");
	});

	it("throws when RESEND_API_KEY is missing", () => {
		process.env.RESEND_API_KEY = undefined;
		expect(() => validateEnvironment()).toThrow("RESEND_API_KEY environment variable is required");
	});

	it("throws when RESEND_FROM_EMAIL is missing", () => {
		process.env.RESEND_FROM_EMAIL = undefined;
		expect(() => validateEnvironment()).toThrow(
			"RESEND_FROM_EMAIL environment variable is required",
		);
	});

	it("passes with all required vars set", () => {
		expect(() => validateEnvironment()).not.toThrow();
	});

	it("warns when STATLI_API_KEY is not set", () => {
		process.env.STATLI_API_KEY = undefined;
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		validateEnvironment();
		expect(warnSpy).toHaveBeenCalledWith("STATLI_API_KEY not set: API key authentication disabled");
		warnSpy.mockRestore();
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateEnvironment } from "../../src/lib/startup.js";

describe("startup validation", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
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

	it("passes with valid AUTH_SECRET", () => {
		process.env.AUTH_SECRET = "a-valid-secret-that-is-definitely-32-chars-long!!";
		expect(() => validateEnvironment()).not.toThrow();
	});

	it("warns when STATLI_API_KEY is not set", () => {
		process.env.AUTH_SECRET = "a-valid-secret-that-is-definitely-32-chars-long!!";
		process.env.STATLI_API_KEY = undefined;
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		validateEnvironment();
		expect(warnSpy).toHaveBeenCalledWith(
			"STATLI_API_KEY not set — API key authentication disabled",
		);
		warnSpy.mockRestore();
	});
});

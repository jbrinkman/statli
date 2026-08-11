import { describe, expect, it } from "vitest";

describe("auth middleware logic", () => {
	const API_KEY = "test-api-key-12345";

	function checkAuth(
		pathname: string,
		authHeader: string | null,
		apiKey: string | undefined,
	): { status: "pass" | "api-key" | "reject"; code?: number } {
		// Skip non-API routes and auth routes
		if (!pathname.startsWith("/api/") || pathname.startsWith("/api/auth/")) {
			return { status: "pass" };
		}

		// Check API key
		if (apiKey && authHeader === `Bearer ${apiKey}`) {
			return { status: "api-key" };
		}

		// No session check in unit test - just reject
		return { status: "reject", code: 401 };
	}

	it("API key auth succeeds", () => {
		const result = checkAuth("/api/projects", `Bearer ${API_KEY}`, API_KEY);
		expect(result.status).toBe("api-key");
	});

	it("missing auth returns 401", () => {
		const result = checkAuth("/api/projects", null, API_KEY);
		expect(result.status).toBe("reject");
		expect(result.code).toBe(401);
	});

	it("invalid API key returns 401", () => {
		const result = checkAuth("/api/projects", "Bearer wrong-key", API_KEY);
		expect(result.status).toBe("reject");
		expect(result.code).toBe(401);
	});

	it("non-API routes pass through without auth", () => {
		const result = checkAuth("/", null, API_KEY);
		expect(result.status).toBe("pass");
	});

	it("auth routes pass through without auth", () => {
		const result = checkAuth("/api/auth/sign-in/email", null, API_KEY);
		expect(result.status).toBe("pass");
	});
});

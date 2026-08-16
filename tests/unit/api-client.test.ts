import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHistory, fetchProjectReviews, fetchProjects } from "../../src/lib/api-client.js";

const mockFetch = vi.fn();

describe("api-client", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", mockFetch);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function makeRequest(url = "http://localhost:4321/dashboard") {
		return new Request(url, {
			headers: { cookie: "session=abc123" },
		});
	}

	describe("fetchProjects", () => {
		it("returns projects on success", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ data: [{ id: "1", name: "Test" }] }),
			});

			const result = await fetchProjects(makeRequest());
			expect(result.data).toEqual([{ id: "1", name: "Test" }]);
			expect(result.error).toBeNull();
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:4321/api/projects",
				expect.objectContaining({ headers: { cookie: "session=abc123" } }),
			);
		});

		it("passes filters as query params", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ data: [] }),
			});

			await fetchProjects(makeRequest(), { status: "merged" });
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:4321/api/projects?status=merged",
				expect.anything(),
			);
		});

		it("returns error on non-ok response", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				json: async () => ({ error: { message: "Unauthorized" } }),
			});

			const result = await fetchProjects(makeRequest());
			expect(result.data).toBeNull();
			expect(result.error).toBe("Unauthorized");
		});

		it("returns error on fetch failure", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			const result = await fetchProjects(makeRequest());
			expect(result.data).toBeNull();
			expect(result.error).toBe("Network error");
		});

		it("handles non-json error response gracefully", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				json: async () => {
					throw new Error("not json");
				},
			});

			const result = await fetchProjects(makeRequest());
			expect(result.data).toBeNull();
			expect(result.error).toBe("HTTP 500");
		});
	});

	describe("fetchProjectReviews", () => {
		it("calls correct endpoint with project ID", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ data: [{ id: "r1", type: "release_model" }] }),
			});

			const result = await fetchProjectReviews(makeRequest(), "proj-123");
			expect(result.data).toHaveLength(1);
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:4321/api/projects/proj-123/reviews?resolved=false",
				expect.anything(),
			);
		});
	});

	describe("fetchHistory", () => {
		it("calls /api/history without since param", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ data: [] }),
			});

			await fetchHistory(makeRequest());
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:4321/api/history",
				expect.anything(),
			);
		});

		it("passes since param when provided", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ data: [] }),
			});

			await fetchHistory(makeRequest(), "2026-08-01T00:00:00Z");
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:4321/api/history?since=2026-08-01T00:00:00Z",
				expect.anything(),
			);
		});
	});
});

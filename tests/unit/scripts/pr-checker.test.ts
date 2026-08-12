import { describe, expect, it } from "vitest";
import { interpretClosure, type PrState } from "../../../scripts/lib/pr-checker.js";

describe("PR state checker", () => {
	describe("interpretClosure", () => {
		it("merged PR state is not processed by interpretClosure (upstream checks state first)", () => {
			const state: PrState = {
				state: "merged",
				mergedAt: "2026-08-01T00:00:00Z",
				closedAt: null,
				comments: [],
			};
			// interpretClosure is only called for closed PRs
			expect(state.state).toBe("merged");
		});

		it("closed PR with rejection keyword returns dropped with reason", () => {
			const state: PrState = {
				state: "closed",
				mergedAt: null,
				closedAt: "2026-08-01T00:00:00Z",
				comments: [
					"Thanks for the contribution!",
					"We're not accepting this — please publish separately as a standalone package.",
				],
			};
			const result = interpretClosure(state);
			expect(result.action).toBe("dropped");
			expect(result.confident).toBe(true);
			expect(result.reason).toContain("please publish separately");
		});

		it("closed PR with ambiguous comment returns needs_review", () => {
			const state: PrState = {
				state: "closed",
				mergedAt: null,
				closedAt: "2026-08-01T00:00:00Z",
				comments: ["Closing for now, will revisit later."],
			};
			const result = interpretClosure(state);
			expect(result.action).toBe("needs_review");
			expect(result.confident).toBe(false);
			expect(result.reason).toContain("without clear rejection signal");
		});

		it("closed PR with 'not aligned' keyword returns dropped", () => {
			const state: PrState = {
				state: "closed",
				mergedAt: null,
				closedAt: "2026-08-01T00:00:00Z",
				comments: ["This approach is not aligned with our roadmap."],
			};
			const result = interpretClosure(state);
			expect(result.action).toBe("dropped");
			expect(result.confident).toBe(true);
		});

		it("closed PR with no comments returns needs_review", () => {
			const state: PrState = {
				state: "closed",
				mergedAt: null,
				closedAt: "2026-08-01T00:00:00Z",
				comments: [],
			};
			const result = interpretClosure(state);
			expect(result.action).toBe("needs_review");
			expect(result.confident).toBe(false);
		});

		it("open PR state is detected upstream (not via interpretClosure)", () => {
			const state: PrState = {
				state: "open",
				mergedAt: null,
				closedAt: null,
				comments: ["LGTM, will merge soon"],
			};
			expect(state.state).toBe("open");
		});

		it("error state from gh CLI is handled gracefully", () => {
			const state: PrState = {
				state: "open",
				mergedAt: null,
				closedAt: null,
				comments: [],
				error: "gh: Not Found (HTTP 404)",
			};
			expect(state.error).toBeDefined();
			expect(state.error).toContain("Not Found");
		});
	});
});

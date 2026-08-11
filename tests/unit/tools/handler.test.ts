import { describe, expect, it, vi } from "vitest";
import { handleToolCall } from "../../../src/mcp-server/tools/handler.js";

// Mock client that returns predictable data
function createMockClient(responses: Record<string, unknown> = {}) {
	return {
		get: vi.fn(async (path: string) => {
			if (
				path.includes("/api/projects") &&
				!path.includes("/reviews") &&
				!path.includes("/history")
			) {
				if (path.includes("name=")) return [{ id: "uuid-1", name: "TestProject" }];
				if (path.includes("/uuid-1"))
					return { id: "uuid-1", name: "TestProject", status: "in_progress" };
				return responses.list || [{ id: "uuid-1", name: "TestProject" }];
			}
			if (path.includes("/reviews")) return responses.reviews || [];
			if (path.includes("/history")) return responses.history || [];
			return responses.default || [];
		}),
		post: vi.fn(async () => responses.post || { id: "new-id", name: "Created" }),
		put: vi.fn(async () => responses.put || { id: "uuid-1", status: "submitted" }),
		delete: vi.fn(async () => ({ deleted: true })),
	};
}

describe("MCP tool handler", () => {
	describe("project tools", () => {
		it("list_projects calls GET /api/projects with filters", async () => {
			const client = createMockClient({ list: [{ id: "1", name: "P1" }] });
			const result = await handleToolCall(client as never, "list_projects", {
				status: "in_progress",
			});
			expect(client.get).toHaveBeenCalledWith("/api/projects", { status: "in_progress" });
			expect(result.content[0].text).toContain("P1");
		});

		it("get_project resolves UUID directly", async () => {
			const client = createMockClient();
			await handleToolCall(client as never, "get_project", {
				identifier: "12345678-1234-1234-1234-123456789012",
			});
			expect(client.get).toHaveBeenCalledWith("/api/projects/12345678-1234-1234-1234-123456789012");
		});

		it("get_project resolves name via lookup", async () => {
			const client = createMockClient();
			await handleToolCall(client as never, "get_project", {
				identifier: "TestProject",
			});
			// First call: name lookup; second call: get by ID
			expect(client.get).toHaveBeenCalledTimes(2);
		});

		it("create_project calls POST", async () => {
			const client = createMockClient();
			const result = await handleToolCall(client as never, "create_project", {
				name: "New",
				category: "integration",
				release_model: "github_release",
			});
			expect(client.post).toHaveBeenCalledWith("/api/projects", {
				name: "New",
				category: "integration",
				release_model: "github_release",
			});
			expect(result.content[0].text).toContain("Created");
		});

		it("update_project resolves ID and calls PUT", async () => {
			const client = createMockClient();
			await handleToolCall(client as never, "update_project", {
				identifier: "TestProject",
				status: "submitted",
			});
			expect(client.put).toHaveBeenCalledWith("/api/projects/uuid-1", {
				status: "submitted",
			});
		});

		it("delete_project calls DELETE", async () => {
			const client = createMockClient();
			const result = await handleToolCall(client as never, "delete_project", {
				identifier: "12345678-1234-1234-1234-123456789012",
			});
			expect(client.delete).toHaveBeenCalled();
			expect(result.content[0].text).toContain("deleted");
		});

		it("lock_project calls POST /lock", async () => {
			const client = createMockClient();
			await handleToolCall(client as never, "lock_project", {
				identifier: "12345678-1234-1234-1234-123456789012",
			});
			expect(client.post).toHaveBeenCalledWith(
				"/api/projects/12345678-1234-1234-1234-123456789012/lock",
			);
		});

		it("unlock_project calls POST /unlock", async () => {
			const client = createMockClient();
			await handleToolCall(client as never, "unlock_project", {
				identifier: "12345678-1234-1234-1234-123456789012",
			});
			expect(client.post).toHaveBeenCalledWith(
				"/api/projects/12345678-1234-1234-1234-123456789012/unlock",
			);
		});
	});

	describe("review tools", () => {
		it("list_review_items by project_id", async () => {
			const client = createMockClient({ reviews: [{ id: "r1", type: "release_model" }] });
			const result = await handleToolCall(client as never, "list_review_items", {
				project_id: "uuid-1",
			});
			expect(client.get).toHaveBeenCalledWith("/api/projects/uuid-1/reviews");
			expect(result.content[0].text).toContain("release_model");
		});

		it("add_review_item calls POST", async () => {
			const client = createMockClient({ post: { id: "new-r", type: "status_change" } });
			await handleToolCall(client as never, "add_review_item", {
				project_id: "uuid-1",
				type: "status_change",
				reason: "Ambiguous signal",
			});
			expect(client.post).toHaveBeenCalledWith("/api/projects/uuid-1/reviews", {
				type: "status_change",
				reason: "Ambiguous signal",
			});
		});

		it("resolve_review_item calls POST /resolve", async () => {
			const client = createMockClient({ post: { id: "r1", resolved: true } });
			await handleToolCall(client as never, "resolve_review_item", { id: "r1" });
			expect(client.post).toHaveBeenCalledWith("/api/reviews/r1/resolve");
		});
	});

	describe("history tools", () => {
		it("get_change_history with project_id", async () => {
			const client = createMockClient({ history: [{ field_changed: "status" }] });
			const result = await handleToolCall(client as never, "get_change_history", {
				project_id: "uuid-1",
			});
			expect(client.get).toHaveBeenCalledWith("/api/projects/uuid-1/history");
			expect(result.content[0].text).toContain("status");
		});

		it("get_change_history with since filter", async () => {
			const client = createMockClient({ history: [] });
			await handleToolCall(client as never, "get_change_history", {
				since: "2026-01-01T00:00:00Z",
			});
			expect(client.get).toHaveBeenCalledWith("/api/history", {
				since: "2026-01-01T00:00:00Z",
			});
		});

		it("get_change_history without filters", async () => {
			const client = createMockClient({ history: [{ id: "h1" }] });
			await handleToolCall(client as never, "get_change_history", {});
			expect(client.get).toHaveBeenCalledWith("/api/history", {});
		});
	});

	it("unknown tool throws error", async () => {
		const client = createMockClient();
		await expect(handleToolCall(client as never, "nonexistent_tool", {})).rejects.toThrow(
			"Unknown tool",
		);
	});
});

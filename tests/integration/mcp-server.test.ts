import { describe, expect, it } from "vitest";
import { getProjectToolDefinitions } from "../../src/mcp-server/tools/projects.js";
import { getReviewToolDefinitions } from "../../src/mcp-server/tools/reviews.js";
import { getHistoryToolDefinitions } from "../../src/mcp-server/tools/history.js";

describe("MCP tool listing", () => {
	it("exposes all 11 tools", () => {
		const allTools = [
			...getProjectToolDefinitions(),
			...getReviewToolDefinitions(),
			...getHistoryToolDefinitions(),
		];
		expect(allTools).toHaveLength(11);
	});

	it("project tools have correct names", () => {
		const tools = getProjectToolDefinitions();
		const names = tools.map((t) => t.name);
		expect(names).toEqual([
			"list_projects",
			"get_project",
			"create_project",
			"update_project",
			"delete_project",
			"lock_project",
			"unlock_project",
		]);
	});

	it("review tools have correct names", () => {
		const tools = getReviewToolDefinitions();
		const names = tools.map((t) => t.name);
		expect(names).toEqual(["list_review_items", "add_review_item", "resolve_review_item"]);
	});

	it("history tool has correct name", () => {
		const tools = getHistoryToolDefinitions();
		expect(tools[0].name).toBe("get_change_history");
	});

	it("all tools have inputSchema", () => {
		const allTools = [
			...getProjectToolDefinitions(),
			...getReviewToolDefinitions(),
			...getHistoryToolDefinitions(),
		];
		for (const tool of allTools) {
			expect(tool.inputSchema).toBeDefined();
			expect(tool.inputSchema.type).toBe("object");
		}
	});

	it("tools requiring identifier have it in required", () => {
		const tools = getProjectToolDefinitions();
		const requiresId = ["get_project", "update_project", "delete_project", "lock_project", "unlock_project"];
		for (const tool of tools) {
			if (requiresId.includes(tool.name)) {
				expect(tool.inputSchema.required).toContain("identifier");
			}
		}
	});
});

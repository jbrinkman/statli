import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseStatusReport } from "../../src/scripts/lib/report-parser.js";

const fixtureReport = fs.readFileSync(
	path.join(import.meta.dirname, "../fixtures/sample-report.md"),
	"utf-8",
);

describe("report parser", () => {
	const projects = parseStatusReport(fixtureReport);

	it("extracts all projects from fixture", () => {
		expect(projects.length).toBeGreaterThanOrEqual(9);
	});

	it("parses integration in_progress correctly", () => {
		const localai = projects.find((p) => p.name === "LocalAI");
		expect(localai).toBeDefined();
		expect(localai?.category).toBe("integration");
		expect(localai?.status).toBe("in_progress");
		expect(localai?.pr_urls).toEqual(["https://github.com/mudler/LocalAI/pull/123"]);
		expect(localai?.issue_urls).toEqual(["https://github.com/mudler/LocalAI/issues/456"]);
		expect(localai?.notes).toBe("Waiting for review");
	});

	it("extracts multiple PR links from single cell", () => {
		const langchain = projects.find((p) => p.name === "LangChain Python");
		expect(langchain).toBeDefined();
		expect(langchain?.pr_urls).toHaveLength(2);
		expect(langchain?.pr_urls).toContain("https://github.com/langchain-ai/langchain/pull/789");
		expect(langchain?.pr_urls).toContain("https://github.com/langchain-ai/langchain/pull/790");
	});

	it("parses submitted status", () => {
		const spring = projects.find((p) => p.name === "Spring AI");
		expect(spring?.status).toBe("submitted");
	});

	it("parses merged status", () => {
		const n8n = projects.find((p) => p.name === "n8n");
		expect(n8n?.status).toBe("merged");
	});

	it("parses completed with release URL", () => {
		const sk = projects.find((p) => p.name === "Semantic Kernel");
		expect(sk?.status).toBe("completed");
		expect(sk?.release_url).toBe(
			"https://github.com/microsoft/semantic-kernel/releases/tag/v1.2.0",
		);
	});

	it("parses dropped with reason", () => {
		const dspy = projects.find((p) => p.name === "DSPy");
		expect(dspy?.status).toBe("dropped");
		expect(dspy?.drop_reason).toBe("Team does not want to maintain two Redis-compatible libraries");
	});

	it("infers valkey_module category", () => {
		const search = projects.find((p) => p.name === "RediSearch");
		expect(search?.category).toBe("valkey_module");
	});

	it("infers valkey_glide category", () => {
		const glide = projects.find((p) => p.name === "Glide Python");
		expect(glide?.category).toBe("valkey_glide");
	});

	it("infers valkey_docs_demos category", () => {
		const cookbook = projects.find((p) => p.name === "Valkey Samples Cookbook");
		expect(cookbook?.category).toBe("valkey_docs_demos");
		expect(cookbook?.status).toBe("completed");
	});

	it("parses infrastructure section", () => {
		const infra = projects.find((p) => p.category === "infrastructure");
		expect(infra).toBeDefined();
		expect(infra?.status).toBe("in_progress");
		expect(infra?.issue_urls.length).toBeGreaterThanOrEqual(1);
	});

	it("handles empty markdown gracefully", () => {
		const empty = parseStatusReport("");
		expect(empty).toEqual([]);
	});

	it("handles markdown with no tables", () => {
		const noTables = parseStatusReport("# Just a heading\n\nSome text.");
		expect(noTables).toEqual([]);
	});
});

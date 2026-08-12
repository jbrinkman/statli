import { describe, expect, it } from "vitest";
import { generateProgress, renderReport } from "../../../scripts/lib/report-renderer.js";
import type { ChangeHistoryEntry } from "../../../src/lib/db/history.js";
import type { Project } from "../../../src/lib/schemas/project.js";

function makeProject(overrides: Partial<Project> = {}): Project {
	return {
		id: "p1",
		name: "Test Project",
		category: "integration",
		status: "in_progress",
		release_model: "github_release",
		release_model_confident: true,
		locked: false,
		pr_urls: [],
		issue_urls: [],
		release_url: null,
		drop_reason: null,
		notes: null,
		needs_review: false,
		created_at: "2026-08-01T00:00:00Z",
		updated_at: "2026-08-10T00:00:00Z",
		deleted_at: null,
		...overrides,
	};
}

function makeHistory(overrides: Partial<ChangeHistoryEntry> = {}): ChangeHistoryEntry {
	return {
		id: "h1",
		project_id: "p1",
		field_changed: "status",
		old_value: "in_progress",
		new_value: "submitted",
		changed_by: "system",
		reason: null,
		created_at: "2026-08-10T00:00:00Z",
		...overrides,
	};
}

describe("report renderer", () => {
	it("completed table renders with project name and release link", () => {
		const output = renderReport({
			projects: [
				makeProject({
					status: "completed",
					name: "Semantic Kernel",
					release_url: "https://github.com/org/repo/releases/tag/v1.0",
				}),
			],
			history: [],
			since: "2026-08-03T00:00:00Z",
		});
		expect(output).toContain("## Completed Projects (1)");
		expect(output).toContain("Semantic Kernel");
		expect(output).toContain("[Release](https://github.com/org/repo/releases/tag/v1.0)");
	});

	it("dropped table includes reason column", () => {
		const output = renderReport({
			projects: [
				makeProject({
					status: "dropped",
					name: "DSPy",
					drop_reason: "Team does not want two Redis libs",
				}),
			],
			history: [],
			since: "2026-08-03T00:00:00Z",
		});
		expect(output).toContain("## Dropped Projects (1)");
		expect(output).toContain("Team does not want two Redis libs");
	});

	it("New label applied to recently-changed items", () => {
		const output = renderReport({
			projects: [makeProject({ id: "p1", status: "submitted", name: "LocalAI" })],
			history: [makeHistory({ project_id: "p1" })],
			since: "2026-08-03T00:00:00Z",
		});
		expect(output).toContain("**New** LocalAI");
	});

	it("empty sections render gracefully", () => {
		const output = renderReport({
			projects: [],
			history: [],
			since: "2026-08-03T00:00:00Z",
		});
		expect(output).toContain("## Completed Projects (0)");
		expect(output).toContain("_None_");
	});
});

describe("generateProgress", () => {
	it("includes integration activity (submissions, merges)", () => {
		const projects = [makeProject({ id: "p1", name: "LocalAI", category: "integration" })];
		const history = [makeHistory({ project_id: "p1", new_value: "submitted" })];
		const output = generateProgress(history, projects);
		expect(output).toContain("LocalAI: PR submitted");
	});

	it("excludes infrastructure items", () => {
		const projects = [makeProject({ id: "p2", name: "CI Fix", category: "infrastructure" })];
		const history = [makeHistory({ project_id: "p2", new_value: "completed" })];
		const output = generateProgress(history, projects);
		expect(output).toContain("No integration activity");
	});

	it("excludes non-status field changes", () => {
		const projects = [makeProject({ id: "p1" })];
		const history = [makeHistory({ project_id: "p1", field_changed: "notes" })];
		const output = generateProgress(history, projects);
		expect(output).toContain("No integration activity");
	});
});

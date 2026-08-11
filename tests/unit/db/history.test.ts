import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getChangeHistory, recordChange } from "../../../src/lib/db/history.js";
import { createDatabase } from "../../../src/lib/db/index.js";
import { createProject } from "../../../src/lib/db/projects.js";

describe("history DAL", () => {
	let db: Database.Database;
	let projectId: string;

	beforeEach(() => {
		db = createDatabase(":memory:");
		const project = createProject(db, {
			name: "Test Project",
			category: "integration",
			release_model: "github_release",
		});
		projectId = project.id;
	});

	afterEach(() => {
		db.close();
	});

	it("recordChange inserts correctly", () => {
		recordChange(db, projectId, "status", "in_progress", "submitted", "user", "PR merged");
		const history = getChangeHistory(db, projectId);
		expect(history).toHaveLength(1);
		expect(history[0].field_changed).toBe("status");
		expect(history[0].old_value).toBe("in_progress");
		expect(history[0].new_value).toBe("submitted");
		expect(history[0].changed_by).toBe("user");
		expect(history[0].reason).toBe("PR merged");
	});

	it("getChangeHistory returns entries for specific project", () => {
		const project2 = createProject(db, {
			name: "Other Project",
			category: "infrastructure",
			release_model: "merge_is_complete",
		});

		recordChange(db, projectId, "status", "in_progress", "submitted", "user");
		recordChange(db, project2.id, "status", "in_progress", "merged", "system");

		const history = getChangeHistory(db, projectId);
		expect(history).toHaveLength(1);
		expect(history[0].project_id).toBe(projectId);
	});

	it("getChangeHistory with since filter excludes older entries", () => {
		recordChange(db, projectId, "status", "in_progress", "submitted", "user");

		// Future timestamp to filter everything
		const futureDate = new Date(Date.now() + 60000).toISOString();
		const history = getChangeHistory(db, projectId, futureDate);
		expect(history).toHaveLength(0);
	});

	it("getChangeHistory without projectId returns all entries", () => {
		const project2 = createProject(db, {
			name: "Other Project",
			category: "infrastructure",
			release_model: "merge_is_complete",
		});

		recordChange(db, projectId, "status", "in_progress", "submitted", "user");
		recordChange(db, project2.id, "category", "infrastructure", "integration", "agent");

		const history = getChangeHistory(db);
		expect(history).toHaveLength(2);
	});
});

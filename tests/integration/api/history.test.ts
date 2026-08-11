import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getChangeHistory } from "../../../src/lib/db/history.js";
import { createDatabase } from "../../../src/lib/db/index.js";
import { createProject, updateProject } from "../../../src/lib/db/projects.js";

describe("history API integration", () => {
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

	it("history returned for project after status change", () => {
		updateProject(db, projectId, { status: "submitted" });
		const history = getChangeHistory(db, projectId);
		expect(history.length).toBeGreaterThan(0);
		expect(history[0].field_changed).toBe("status");
	});

	it("history with since filter", () => {
		updateProject(db, projectId, { status: "submitted" });
		const future = new Date(Date.now() + 60000).toISOString();
		const history = getChangeHistory(db, projectId, future);
		expect(history).toHaveLength(0);
	});

	it("global history endpoint returns all entries", () => {
		const project2 = createProject(db, {
			name: "Project 2",
			category: "infrastructure",
			release_model: "merge_is_complete",
		});
		updateProject(db, projectId, { status: "submitted" });
		updateProject(db, project2.id, { status: "merged" });

		const allHistory = getChangeHistory(db);
		expect(allHistory.length).toBeGreaterThanOrEqual(2);
	});
});

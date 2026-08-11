import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "../../../src/lib/db/index.js";
import { createProject } from "../../../src/lib/db/projects.js";
import { addReviewItem, getReviewItems, resolveReviewItem } from "../../../src/lib/db/reviews.js";

describe("review items DAL", () => {
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

	it("addReviewItem creates item with correct defaults", () => {
		const item = addReviewItem(db, projectId, "release_model", "Uncertain release model");
		expect(item.id).toBeDefined();
		expect(item.project_id).toBe(projectId);
		expect(item.type).toBe("release_model");
		expect(item.reason).toBe("Uncertain release model");
		expect(item.resolved).toBe(false);
		expect(item.resolved_at).toBeNull();
	});

	it("addReviewItem with invalid type throws", () => {
		expect(() => addReviewItem(db, projectId, "invalid_type", "reason")).toThrow();
	});

	it("resolveReviewItem sets resolved and resolved_at", () => {
		const item = addReviewItem(db, projectId, "status_change", "Ambiguous signal");
		const resolved = resolveReviewItem(db, item.id);
		expect(resolved).not.toBeNull();
		expect(resolved?.resolved).toBe(true);
		expect(resolved?.resolved_at).toBeDefined();
	});

	it("resolveReviewItem with bad id returns null", () => {
		expect(resolveReviewItem(db, "non-existent")).toBeNull();
	});

	it("getReviewItems filters by project", () => {
		const project2 = createProject(db, {
			name: "Other",
			category: "infrastructure",
			release_model: "merge_is_complete",
		});
		addReviewItem(db, projectId, "release_model", "reason1");
		addReviewItem(db, project2.id, "status_change", "reason2");

		const items = getReviewItems(db, projectId);
		expect(items).toHaveLength(1);
		expect(items[0].project_id).toBe(projectId);
	});

	it("getReviewItems filters by resolved status", () => {
		const item = addReviewItem(db, projectId, "release_model", "reason");
		addReviewItem(db, projectId, "status_change", "reason2");
		resolveReviewItem(db, item.id);

		const unresolved = getReviewItems(db, projectId, { resolved: false });
		expect(unresolved).toHaveLength(1);

		const resolved = getReviewItems(db, projectId, { resolved: true });
		expect(resolved).toHaveLength(1);
	});

	it("getReviewItems filters by type", () => {
		addReviewItem(db, projectId, "release_model", "reason1");
		addReviewItem(db, projectId, "status_change", "reason2");

		const items = getReviewItems(db, projectId, { type: "release_model" });
		expect(items).toHaveLength(1);
		expect(items[0].type).toBe("release_model");
	});

	it("multiple unresolved items can coexist on same project", () => {
		addReviewItem(db, projectId, "release_model", "reason1");
		addReviewItem(db, projectId, "status_change", "reason2");
		addReviewItem(db, projectId, "ambiguous_signal", "reason3");

		const items = getReviewItems(db, projectId, { resolved: false });
		expect(items).toHaveLength(3);
	});
});

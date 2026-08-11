import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "../../../src/lib/db/index.js";
import { createProject } from "../../../src/lib/db/projects.js";
import { addReviewItem, getReviewItems, resolveReviewItem } from "../../../src/lib/db/reviews.js";

describe("review API integration", () => {
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

	it("create review item", () => {
		const item = addReviewItem(db, projectId, "release_model", "Uncertain release model");
		expect(item.id).toBeDefined();
		expect(item.type).toBe("release_model");
		expect(item.resolved).toBe(false);
	});

	it("list review items for project", () => {
		addReviewItem(db, projectId, "release_model", "reason1");
		addReviewItem(db, projectId, "status_change", "reason2");
		const items = getReviewItems(db, projectId);
		expect(items).toHaveLength(2);
	});

	it("list all reviews with filters", () => {
		addReviewItem(db, projectId, "release_model", "reason1");
		addReviewItem(db, projectId, "status_change", "reason2");
		const releaseModel = getReviewItems(db, undefined, { type: "release_model" });
		expect(releaseModel).toHaveLength(1);
	});

	it("resolve review item", () => {
		const item = addReviewItem(db, projectId, "release_model", "reason");
		const resolved = resolveReviewItem(db, item.id);
		expect(resolved?.resolved).toBe(true);
		expect(resolved?.resolved_at).toBeDefined();
	});

	it("404 on resolve missing item", () => {
		expect(resolveReviewItem(db, "nonexistent")).toBeNull();
	});
});

import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "../../../src/lib/db/index.js";
import {
	ConflictError,
	createProject,
	deleteProject,
	getProject,
	listProjects,
	lockProject,
	updateProject,
} from "../../../src/lib/db/projects.js";
import { createProjectSchema } from "../../../src/lib/schemas/project.js";

const validData = {
	name: "Test Integration",
	category: "integration" as const,
	release_model: "github_release" as const,
	pr_urls: ["https://github.com/org/repo/pull/1"],
};

describe("project API integration", () => {
	let db: Database.Database;

	beforeEach(() => {
		db = createDatabase(":memory:");
	});

	afterEach(() => {
		db.close();
	});

	it("full CRUD flow: create, get, list, update, delete", () => {
		// Create
		const created = createProject(db, validData);
		expect(created.id).toBeDefined();
		expect(created.name).toBe("Test Integration");
		expect(created.pr_urls).toEqual(["https://github.com/org/repo/pull/1"]);

		// Get
		const fetched = getProject(db, created.id);
		expect(fetched).not.toBeNull();
		expect(fetched?.name).toBe("Test Integration");

		// List
		const list = listProjects(db);
		expect(list).toHaveLength(1);

		// Update
		const updated = updateProject(db, created.id, { status: "submitted" });
		expect(updated?.status).toBe("submitted");

		// Delete
		const deleted = deleteProject(db, created.id);
		expect(deleted).toBe(true);

		// Verify deleted
		const afterDelete = getProject(db, created.id);
		expect(afterDelete).toBeNull();
		expect(listProjects(db)).toHaveLength(0);
	});

	it("validation errors on invalid data", () => {
		expect(() => createProjectSchema.parse({ name: "" })).toThrow();
		expect(() => createProjectSchema.parse({ name: "x", category: "invalid" })).toThrow();
	});

	it("404 on missing project", () => {
		expect(getProject(db, "nonexistent")).toBeNull();
		expect(updateProject(db, "nonexistent", { status: "merged" })).toBeNull();
		expect(deleteProject(db, "nonexistent")).toBe(false);
	});

	it("409 on locked project update", () => {
		const project = createProject(db, validData);
		lockProject(db, project.id);
		expect(() => updateProject(db, project.id, { status: "merged" })).toThrow(ConflictError);
	});

	it("query filters work", () => {
		createProject(db, validData);
		createProject(db, {
			...validData,
			name: "Infra Project",
			category: "infrastructure",
			status: "merged",
		});

		expect(listProjects(db, { status: "merged" })).toHaveLength(1);
		expect(listProjects(db, { category: "infrastructure" })).toHaveLength(1);
		expect(listProjects(db, { status: "dropped" })).toHaveLength(0);
	});
});

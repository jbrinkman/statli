import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getChangeHistory } from "../../../src/lib/db/history.js";
import { createDatabase } from "../../../src/lib/db/index.js";
import {
	ConflictError,
	createProject,
	deleteProject,
	getProject,
	listProjects,
	lockProject,
	unlockProject,
	updateProject,
} from "../../../src/lib/db/projects.js";

const validProject = {
	name: "Test Project",
	category: "integration" as const,
	release_model: "github_release" as const,
};

describe("project DAL", () => {
	let db: Database.Database;

	beforeEach(() => {
		db = createDatabase(":memory:");
	});

	afterEach(() => {
		db.close();
	});

	describe("createProject", () => {
		it("creates a project with valid data", () => {
			const project = createProject(db, validProject);
			expect(project.id).toBeDefined();
			expect(project.name).toBe("Test Project");
			expect(project.category).toBe("integration");
			expect(project.status).toBe("in_progress");
			expect(project.release_model).toBe("github_release");
			expect(project.release_model_confident).toBe(false);
			expect(project.locked).toBe(false);
			expect(project.pr_urls).toEqual([]);
			expect(project.issue_urls).toEqual([]);
			expect(project.created_at).toBeDefined();
			expect(project.updated_at).toBeDefined();
		});

		it("throws on invalid data", () => {
			expect(() =>
				createProject(db, { name: "", category: "integration", release_model: "github_release" }),
			).toThrow();
		});

		it("throws on duplicate name", () => {
			createProject(db, validProject);
			expect(() => createProject(db, validProject)).toThrow();
		});
	});

	describe("getProject", () => {
		it("returns project by id", () => {
			const created = createProject(db, validProject);
			const found = getProject(db, created.id);
			expect(found).not.toBeNull();
			expect(found?.name).toBe("Test Project");
		});

		it("returns null for non-existent id", () => {
			expect(getProject(db, "non-existent")).toBeNull();
		});

		it("returns null for soft-deleted project", () => {
			const created = createProject(db, validProject);
			deleteProject(db, created.id);
			expect(getProject(db, created.id)).toBeNull();
		});
	});

	describe("listProjects", () => {
		it("returns all non-deleted projects", () => {
			createProject(db, validProject);
			createProject(db, { ...validProject, name: "Second" });
			const projects = listProjects(db);
			expect(projects).toHaveLength(2);
		});

		it("filters by status", () => {
			createProject(db, validProject);
			createProject(db, { ...validProject, name: "Submitted", status: "submitted" });
			const results = listProjects(db, { status: "submitted" });
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe("Submitted");
		});

		it("filters by category", () => {
			createProject(db, validProject);
			createProject(db, {
				...validProject,
				name: "Infra",
				category: "infrastructure",
			});
			const results = listProjects(db, { category: "infrastructure" });
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe("Infra");
		});

		it("filters by name (case-insensitive)", () => {
			createProject(db, validProject);
			createProject(db, { ...validProject, name: "LocalAI" });

			const exact = listProjects(db, { name: "LocalAI" });
			expect(exact).toHaveLength(1);
			expect(exact[0].name).toBe("LocalAI");

			const caseInsensitive = listProjects(db, { name: "localai" });
			expect(caseInsensitive).toHaveLength(1);

			const noMatch = listProjects(db, { name: "nonexistent" });
			expect(noMatch).toHaveLength(0);
		});
	});

	describe("updateProject", () => {
		it("updates fields and records change history", () => {
			const created = createProject(db, validProject);
			const updated = updateProject(db, created.id, { status: "submitted" });
			expect(updated?.status).toBe("submitted");

			const history = getChangeHistory(db, created.id);
			expect(history.length).toBeGreaterThan(0);
			expect(history[0].field_changed).toBe("status");
			expect(history[0].old_value).toBe("in_progress");
			expect(history[0].new_value).toBe("submitted");
		});

		it("throws ConflictError when updating locked project status without force", () => {
			const created = createProject(db, validProject);
			lockProject(db, created.id);
			expect(() => updateProject(db, created.id, { status: "submitted" })).toThrow(ConflictError);
		});

		it("allows update of locked project with force:true", () => {
			const created = createProject(db, validProject);
			lockProject(db, created.id);
			const updated = updateProject(db, created.id, {
				status: "submitted",
				force: true,
			});
			expect(updated?.status).toBe("submitted");
		});

		it("returns null for non-existent project", () => {
			expect(updateProject(db, "missing", { status: "submitted" })).toBeNull();
		});
	});

	describe("deleteProject", () => {
		it("soft-deletes the project", () => {
			const created = createProject(db, validProject);
			const result = deleteProject(db, created.id);
			expect(result).toBe(true);
			expect(getProject(db, created.id)).toBeNull();
		});

		it("returns false for non-existent project", () => {
			expect(deleteProject(db, "missing")).toBe(false);
		});
	});

	describe("lockProject / unlockProject", () => {
		it("locks and unlocks a project with history", () => {
			const created = createProject(db, validProject);
			const locked = lockProject(db, created.id);
			expect(locked?.locked).toBe(true);

			const unlocked = unlockProject(db, created.id);
			expect(unlocked?.locked).toBe(false);

			const history = getChangeHistory(db, created.id);
			const lockEntries = history.filter((h) => h.field_changed === "locked");
			expect(lockEntries).toHaveLength(2);
		});

		it("returns null for non-existent project", () => {
			expect(lockProject(db, "missing")).toBeNull();
			expect(unlockProject(db, "missing")).toBeNull();
		});
	});
});

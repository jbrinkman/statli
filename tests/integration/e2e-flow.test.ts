import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getChangeHistory } from "../../src/lib/db/history.js";
import { createDatabase } from "../../src/lib/db/index.js";
import {
	ConflictError,
	createProject,
	deleteProject,
	getProject,
	listProjects,
	lockProject,
	unlockProject,
	updateProject,
} from "../../src/lib/db/projects.js";
import { addReviewItem, getReviewItems, resolveReviewItem } from "../../src/lib/db/reviews.js";

describe("full project lifecycle e2e", () => {
	let db: Database.Database;

	beforeEach(() => {
		db = createDatabase(":memory:");
	});

	afterEach(() => {
		db.close();
	});

	it("complete lifecycle: create → update → lock → review → resolve → unlock → delete", () => {
		// 1. Create a project
		const project = createProject(db, {
			name: "Lifecycle Test",
			category: "integration",
			release_model: "github_release",
			pr_urls: ["https://github.com/org/repo/pull/42"],
		});
		expect(project.id).toBeDefined();
		expect(project.status).toBe("in_progress");

		// 2. Update its status (verify change history recorded)
		const updated = updateProject(db, project.id, { status: "submitted" }, "system");
		expect(updated?.status).toBe("submitted");
		const history1 = getChangeHistory(db, project.id);
		expect(history1.some((h) => h.field_changed === "status")).toBe(true);

		// 3. Lock it (verify status update rejected without force)
		lockProject(db, project.id, "user");
		expect(() => updateProject(db, project.id, { status: "merged" })).toThrow(ConflictError);

		// Verify force override works
		const forced = updateProject(db, project.id, { status: "merged", force: true });
		expect(forced?.status).toBe("merged");

		// 4. Add review item (verify needs_review computed true on list)
		addReviewItem(db, project.id, "release_model", "Not sure about release model");
		const listWithReview = listProjects(db);
		expect(listWithReview[0].needs_review).toBe(true);

		// 5. Resolve review item (verify needs_review computed false)
		const items = getReviewItems(db, project.id, { resolved: false });
		expect(items).toHaveLength(1);
		resolveReviewItem(db, items[0].id);
		const listAfterResolve = listProjects(db);
		expect(listAfterResolve[0].needs_review).toBe(false);

		// 6. Unlock and soft-delete
		unlockProject(db, project.id, "user");
		const unlocked = getProject(db, project.id);
		expect(unlocked?.locked).toBe(false);

		deleteProject(db, project.id);

		// 7. Verify deleted project excluded from list
		expect(getProject(db, project.id)).toBeNull();
		expect(listProjects(db)).toHaveLength(0);

		// 8. Verify full change history for project
		const fullHistory = getChangeHistory(db, project.id);
		expect(fullHistory.length).toBeGreaterThanOrEqual(5);
		const fields = fullHistory.map((h) => h.field_changed);
		expect(fields).toContain("status");
		expect(fields).toContain("locked");
		expect(fields).toContain("deleted_at");
	});
});

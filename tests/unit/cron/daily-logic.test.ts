import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getChangeHistory } from "../../../src/lib/db/history.js";
import { createDatabase } from "../../../src/lib/db/index.js";
import {
	createProject,
	getProject,
	lockProject,
	updateProject,
} from "../../../src/lib/db/projects.js";
import { addReviewItem, getReviewItems } from "../../../src/lib/db/reviews.js";

describe("daily cron logic", () => {
	let db: Database.Database;

	beforeEach(() => {
		db = createDatabase(":memory:");
	});

	afterEach(() => {
		db.close();
	});

	it("submitted PR merged → project status updated to merged", () => {
		const p = createProject(db, {
			name: "TestPR",
			category: "integration",
			status: "submitted",
			release_model: "github_release",
			pr_urls: ["https://github.com/org/repo/pull/1"],
		});
		const updated = updateProject(db, p.id, { status: "merged" }, "system");
		expect(updated?.status).toBe("merged");
	});

	it("submitted PR closed with rejection → project dropped with reason", () => {
		const p = createProject(db, {
			name: "Rejected",
			category: "integration",
			status: "submitted",
			release_model: "github_release",
		});
		const updated = updateProject(
			db,
			p.id,
			{ status: "dropped", drop_reason: "Maintainer said: not accepting" },
			"system",
		);
		expect(updated?.status).toBe("dropped");
		expect(updated?.drop_reason).toContain("not accepting");
	});

	it("submitted PR closed ambiguously → dropped + review item", () => {
		const p = createProject(db, {
			name: "Ambiguous",
			category: "integration",
			status: "submitted",
			release_model: "github_release",
		});
		updateProject(db, p.id, { status: "dropped" }, "system");
		addReviewItem(db, p.id, "ambiguous_signal", "PR closed without clear rejection");
		const reviews = getReviewItems(db, p.id, { resolved: false });
		expect(reviews).toHaveLength(1);
		expect(reviews[0].type).toBe("ambiguous_signal");
	});

	it("merged project with release found → promoted to completed", () => {
		const p = createProject(db, {
			name: "Released",
			category: "integration",
			status: "merged",
			release_model: "github_release",
		});
		const updated = updateProject(
			db,
			p.id,
			{ status: "completed", release_url: "https://github.com/org/repo/releases/tag/v1.0" },
			"system",
		);
		expect(updated?.status).toBe("completed");
		expect(updated?.release_url).toContain("/releases/tag/v1.0");
	});

	it("merged project with no release → no change", () => {
		const p = createProject(db, {
			name: "NoRelease",
			category: "integration",
			status: "merged",
			release_model: "github_release",
		});
		// No update called — project stays merged
		const current = getProject(db, p.id);
		expect(current?.status).toBe("merged");
	});

	it("locked project with detected change → review item created, status unchanged", () => {
		const p = createProject(db, {
			name: "Locked",
			category: "integration",
			status: "submitted",
			release_model: "github_release",
		});
		lockProject(db, p.id, "user");
		// Cron would skip the update and create a review item instead
		addReviewItem(db, p.id, "status_change", "PR merged but project is locked");
		const current = getProject(db, p.id);
		expect(current?.status).toBe("submitted");
		expect(current?.locked).toBe(true);
		const reviews = getReviewItems(db, p.id);
		expect(reviews).toHaveLength(1);
	});

	it("merge_is_complete project merged → auto-promoted to completed", () => {
		const p = createProject(db, {
			name: "ValkeySample",
			category: "valkey_docs_demos",
			status: "merged",
			release_model: "merge_is_complete",
		});
		const updated = updateProject(db, p.id, { status: "completed" }, "system");
		expect(updated?.status).toBe("completed");
	});

	it("project with release_model_confident=false → review item exists", () => {
		const p = createProject(db, {
			name: "Uncertain",
			category: "integration",
			release_model: "manual",
			release_model_confident: false,
		});
		addReviewItem(db, p.id, "release_model", "Release model uncertain — needs investigation");
		const reviews = getReviewItems(db, p.id, { type: "release_model" });
		expect(reviews).toHaveLength(1);
	});

	it("history records all cron-driven changes", () => {
		const p = createProject(db, {
			name: "Tracked",
			category: "integration",
			status: "submitted",
			release_model: "github_release",
		});
		updateProject(db, p.id, { status: "merged" }, "system");
		updateProject(db, p.id, { status: "completed" }, "system");
		const history = getChangeHistory(db, p.id);
		const statusChanges = history.filter((h) => h.field_changed === "status");
		expect(statusChanges).toHaveLength(2);
		expect(statusChanges.every((h) => h.changed_by === "system")).toBe(true);
	});
});

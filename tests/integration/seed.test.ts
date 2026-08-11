import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "../../src/lib/db/index.js";
import { createProject, listProjects } from "../../src/lib/db/projects.js";
import { addReviewItem, getReviewItems } from "../../src/lib/db/reviews.js";
import { inferReleaseModel } from "../../src/scripts/lib/release-model.js";
import { parseStatusReport } from "../../src/scripts/lib/report-parser.js";

const fixtureReport = fs.readFileSync(
	path.join(import.meta.dirname, "../fixtures/sample-report.md"),
	"utf-8",
);

function runSeed(db: Database.Database, markdown: string) {
	const parsed = parseStatusReport(markdown);
	let created = 0;
	let skipped = 0;

	for (const project of parsed) {
		const normalized = project.name.trim();
		if (!normalized) {
			skipped++;
			continue;
		}
		const existing = listProjects(db, { name: normalized });
		if (existing.length > 0) {
			skipped++;
			continue;
		}
		const releaseResult = inferReleaseModel(project);
		const createdProject = createProject(db, {
			name: normalized,
			category: project.category as
				| "integration"
				| "valkey_module"
				| "valkey_glide"
				| "valkey_docs_demos"
				| "infrastructure",
			status: project.status as "in_progress" | "submitted" | "merged" | "completed" | "dropped",
			release_model: releaseResult.model,
			release_model_confident: releaseResult.confident,
			pr_urls: project.pr_urls,
			issue_urls: project.issue_urls,
			release_url: project.release_url,
			drop_reason: project.drop_reason,
			notes: project.notes,
		});
		if (!releaseResult.confident) {
			addReviewItem(
				db,
				createdProject.id,
				"release_model",
				`Release model inferred as "${releaseResult.model}" with low confidence`,
			);
		}
		created++;
	}
	return { created, skipped };
}

describe("seed script", () => {
	let db: Database.Database;

	beforeEach(() => {
		db = createDatabase(":memory:");
	});

	afterEach(() => {
		db.close();
	});

	it("seeds correct number of projects from fixture", () => {
		const { created } = runSeed(db, fixtureReport);
		expect(created).toBeGreaterThanOrEqual(9);
		const projects = listProjects(db);
		expect(projects.length).toBe(created);
	});

	it("is idempotent — second run creates no duplicates", () => {
		const first = runSeed(db, fixtureReport);
		const second = runSeed(db, fixtureReport);
		expect(second.created).toBe(0);
		expect(second.skipped).toBe(first.created);
		expect(listProjects(db).length).toBe(first.created);
	});

	it("creates review items for low-confidence release models", () => {
		runSeed(db, fixtureReport);
		const allReviews = getReviewItems(db, undefined, { type: "release_model" });
		expect(allReviews.length).toBeGreaterThan(0);
		for (const review of allReviews) {
			expect(review.reason).toContain("low confidence");
		}
	});
});

import fs from "node:fs";
import { createDatabase } from "../lib/db/index.js";
import { createProject, listProjects } from "../lib/db/projects.js";
import { addReviewItem } from "../lib/db/reviews.js";
import { inferReleaseModel } from "./lib/release-model.js";
import { parseStatusReport } from "./lib/report-parser.js";

const reportPath = process.argv.includes("--report-path")
	? process.argv[process.argv.indexOf("--report-path") + 1]
	: null;

if (!reportPath) {
	console.error("Usage: seed --report-path <path-to-report.md>");
	process.exit(1);
}

if (!fs.existsSync(reportPath)) {
	console.error(`Report file not found: ${reportPath}`);
	process.exit(1);
}

const markdown = fs.readFileSync(reportPath, "utf-8");
const parsed = parseStatusReport(markdown);

const db = createDatabase();
let created = 0;
let skipped = 0;
let failed = 0;

for (const project of parsed) {
	const normalized = project.name.trim();
	if (!normalized) {
		skipped++;
		continue;
	}

	// Check if already exists (case-insensitive)
	const existing = listProjects(db, { name: normalized });
	if (existing.length > 0) {
		skipped++;
		continue;
	}

	const releaseResult = inferReleaseModel(project);

	try {
		const created_project = createProject(db, {
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
				created_project.id,
				"release_model",
				`Release model inferred as "${releaseResult.model}" with low confidence`,
			);
		}

		created++;
	} catch (error) {
		console.error(`Failed to create project "${normalized}": ${(error as Error).message}`);
		failed++;
	}
}

console.log(`Seeded ${created} new, ${skipped} skipped (existing), ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

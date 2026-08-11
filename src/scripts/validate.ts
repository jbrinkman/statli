import { execSync } from "node:child_process";
import { createDatabase } from "../lib/db/index.js";
import { listProjects } from "../lib/db/projects.js";
import { addReviewItem, getReviewItems } from "../lib/db/reviews.js";

export interface ConfluenceProject {
	name: string;
	status: string;
}

export function parseConfluenceHtml(html: string): ConfluenceProject[] {
	const projects: ConfluenceProject[] = [];
	// Simple table row extraction via regex
	const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
	const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

	let rowMatch = rowRegex.exec(html);
	while (rowMatch) {
		const cells: string[] = [];
		let cellMatch = cellRegex.exec(rowMatch[1]);
		while (cellMatch) {
			// Strip HTML tags
			cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
			cellMatch = cellRegex.exec(rowMatch[1]);
		}
		if (cells.length >= 2 && cells[0]) {
			projects.push({ name: cells[0], status: cells[1]?.toLowerCase() || "" });
		}
		rowMatch = rowRegex.exec(html);
	}
	return projects;
}

function hasExistingReviewItem(
	db: ReturnType<typeof createDatabase>,
	projectId: string,
	type: string,
	reasonSubstr: string,
): boolean {
	const items = getReviewItems(db, projectId, { type, resolved: false });
	return items.some((item) => item.reason.includes(reasonSubstr));
}

export async function runValidation() {
	// Check Atlassian CLI availability
	try {
		execSync("which atlas", { stdio: "pipe" });
	} catch {
		console.warn("Atlassian CLI (atlas) not found. Skipping Confluence validation.");
		return { validated: 0, flagged: 0, skipped: true };
	}

	let html: string;
	try {
		html = execSync(
			'atlas confluence page get --space "TEAM" --title "PR Status Tracker" --output-format html',
			{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
	} catch (error) {
		console.error("Failed to fetch Confluence page:", (error as Error).message);
		return { validated: 0, flagged: 0, skipped: false };
	}

	const confluenceProjects = parseConfluenceHtml(html);
	const db = createDatabase();
	let flagged = 0;

	for (const cp of confluenceProjects) {
		const dbProjects = listProjects(db, { name: cp.name });

		if (dbProjects.length === 0) {
			// Not found in DB — would need to flag, but no project_id to attach to
			console.warn(`Confluence project "${cp.name}" not found in DB`);
			continue;
		}

		const dbProject = dbProjects[0];

		// Check status mismatch
		if (cp.status && cp.status !== dbProject.status) {
			const reason = `Status mismatch: Confluence="${cp.status}", DB="${dbProject.status}"`;
			if (!hasExistingReviewItem(db, dbProject.id, "status_change", "Status mismatch")) {
				addReviewItem(db, dbProject.id, "status_change", reason);
				flagged++;
			}
		}
	}

	console.log(
		`Validated ${confluenceProjects.length} projects. ${flagged} new discrepancies flagged.`,
	);
	return { validated: confluenceProjects.length, flagged, skipped: false };
}

// Run if executed directly
const isMain = process.argv[1]?.includes("validate");
if (isMain) {
	runValidation();
}

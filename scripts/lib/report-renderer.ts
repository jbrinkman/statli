import type { Project } from "../../src/lib/schemas/project.js";
import type { ChangeHistoryEntry } from "../../src/lib/db/history.js";

export interface ReportData {
	projects: Project[];
	history: ChangeHistoryEntry[];
	since: string;
}

function isRecent(project: Project, recentProjectIds: Set<string>): boolean {
	return recentProjectIds.has(project.id);
}

function formatPrLinks(urls: string[]): string {
	if (urls.length === 0) return "";
	return urls.map((url) => {
		const match = /\/pull\/(\d+)/.exec(url);
		const label = match ? `PR #${match[1]}` : "PR";
		return `[${label}](${url})`;
	}).join(", ");
}

function renderTable(
	projects: Project[],
	recentIds: Set<string>,
	columns: string[],
	rowFn: (p: Project, recent: boolean) => string[],
): string {
	if (projects.length === 0) return "_None_\n";
	const header = `| ${columns.join(" | ")} |\n|${columns.map(() => "---").join("|")}|\n`;
	const rows = projects
		.map((p) => {
			const cells = rowFn(p, recentIds.has(p.id));
			return `| ${cells.join(" | ")} |`;
		})
		.join("\n");
	return header + rows + "\n";
}

export function renderReport(data: ReportData): string {
	const { projects, history, since } = data;
	const recentIds = new Set(history.map((h) => h.project_id));

	const completed = projects.filter((p) => p.status === "completed");
	const merged = projects.filter((p) => p.status === "merged");
	const submitted = projects.filter((p) => p.status === "submitted");
	const inProgress = projects.filter((p) => p.status === "in_progress");
	const dropped = projects.filter((p) => p.status === "dropped");

	let output = "# Weekly Status Report\n\n";
	output += `_Generated: ${new Date().toISOString().split("T")[0]}, covering changes since ${since.split("T")[0]}_\n\n`;

	// Completed
	output += `## Completed Projects (${completed.length})\n\n`;
	output += renderTable(
		completed,
		recentIds,
		["Project", "PRs", "Release", "Notes"],
		(p, recent) => [
			recent ? `**New** ${p.name}` : p.name,
			formatPrLinks(p.pr_urls),
			p.release_url ? `[Release](${p.release_url})` : "",
			p.notes || "",
		],
	);
	output += "\n";

	// Merged
	output += `## Merged Projects (${merged.length})\n\n`;
	output += renderTable(
		merged,
		recentIds,
		["Project", "PRs", "Notes"],
		(p, recent) => [
			recent ? `**New** ${p.name}` : p.name,
			formatPrLinks(p.pr_urls),
			p.notes || "",
		],
	);
	output += "\n";

	// Submitted
	output += `## Submitted Projects (${submitted.length})\n\n`;
	output += renderTable(
		submitted,
		recentIds,
		["Project", "PRs", "Notes"],
		(p, recent) => [
			recent ? `**New** ${p.name}` : p.name,
			formatPrLinks(p.pr_urls),
			p.notes || "",
		],
	);
	output += "\n";

	// In Progress
	output += `## In Progress (${inProgress.length})\n\n`;
	output += renderTable(
		inProgress,
		recentIds,
		["Project", "PRs", "Notes"],
		(p, recent) => [
			recent ? `**New** ${p.name}` : p.name,
			formatPrLinks(p.pr_urls),
			p.notes || "",
		],
	);
	output += "\n";

	// Dropped
	output += `## Dropped Projects (${dropped.length})\n\n`;
	output += renderTable(
		dropped,
		recentIds,
		["Project", "PRs", "Reason"],
		(p, recent) => [
			recent ? `**New** ${p.name}` : p.name,
			formatPrLinks(p.pr_urls),
			p.drop_reason || "",
		],
	);
	output += "\n";

	// This Week's Progress
	output += "## This Week's Progress\n\n";
	output += generateProgress(history, projects);
	output += "\n";

	// Placeholder sections
	output += "## Summary\n\n_To be filled manually._\n\n";
	output += "## Risks & Blockers\n\n_To be filled manually._\n\n";
	output += "## Next Week's Focus\n\n_To be filled manually._\n\n";
	output += "## Staffing\n\n_To be filled manually._\n\n";

	return output;
}

export function generateProgress(
	history: ChangeHistoryEntry[],
	projects: Project[],
): string {
	const projectMap = new Map(projects.map((p) => [p.id, p]));
	const lines: string[] = [];

	// Filter to integration-activity only status changes
	const statusChanges = history.filter((h) => {
		if (h.field_changed !== "status") return false;
		const project = projectMap.get(h.project_id);
		if (!project) return false;
		// Exclude infrastructure and general items
		if (project.category === "infrastructure") return false;
		return true;
	});

	for (const change of statusChanges) {
		const project = projectMap.get(change.project_id);
		if (!project) continue;

		const action = describeStatusChange(change.old_value, change.new_value, project);
		if (action) lines.push(`- ${action}`);
	}

	if (lines.length === 0) {
		return "_No integration activity this week._\n";
	}

	return lines.join("\n") + "\n";
}

function describeStatusChange(
	oldStatus: string | null,
	newStatus: string | null,
	project: Project,
): string | null {
	switch (newStatus) {
		case "submitted":
			return `${project.name}: PR submitted`;
		case "merged":
			return `${project.name}: PR merged`;
		case "completed":
			return `${project.name}: released${project.release_url ? ` (${project.release_url})` : ""}`;
		case "dropped":
			return `${project.name}: dropped${project.drop_reason ? ` — ${project.drop_reason}` : ""}`;
		default:
			return null;
	}
}

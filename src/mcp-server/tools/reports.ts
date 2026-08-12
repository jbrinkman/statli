import type { StatliClient } from "../client.js";

export function getReportToolDefinitions() {
	return [
		{
			name: "generate_report",
			description: "Generate a weekly status report from current project data",
			inputSchema: {
				type: "object" as const,
				properties: {
					since: {
						type: "string",
						description: "ISO date — report covers changes since this date (default: 7 days ago)",
					},
				},
			},
		},
	];
}

interface Project {
	id: string;
	name: string;
	status: string;
	category: string;
	pr_urls: string[];
	release_url: string | null;
	drop_reason: string | null;
	notes: string | null;
	[key: string]: unknown;
}

interface HistoryEntry {
	project_id: string;
	field_changed: string;
	old_value: string | null;
	new_value: string | null;
	[key: string]: unknown;
}

export async function handleGenerateReport(client: StatliClient, args: Record<string, unknown>) {
	const since =
		(args.since as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const projects = await client.get<Project[]>("/api/projects");
	const history = await client.get<HistoryEntry[]>("/api/history", { since });

	// Inline minimal report generation (avoids importing from scripts/)
	const recentIds = new Set(history.map((h) => h.project_id));
	const grouped = {
		completed: projects.filter((p) => p.status === "completed"),
		merged: projects.filter((p) => p.status === "merged"),
		submitted: projects.filter((p) => p.status === "submitted"),
		in_progress: projects.filter((p) => p.status === "in_progress"),
		dropped: projects.filter((p) => p.status === "dropped"),
	};

	let report = `# Weekly Status Report\n\n`;
	report += `_Covering changes since ${since.split("T")[0]}_\n\n`;

	for (const [status, items] of Object.entries(grouped)) {
		const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
		report += `## ${label} (${items.length})\n\n`;
		if (items.length === 0) {
			report += "_None_\n\n";
			continue;
		}
		for (const p of items) {
			const recent = recentIds.has(p.id) ? "**New** " : "";
			const prs = p.pr_urls.length > 0 ? ` — ${p.pr_urls.length} PR(s)` : "";
			report += `- ${recent}${p.name}${prs}\n`;
		}
		report += "\n";
	}

	return { content: [{ type: "text", text: report }] };
}

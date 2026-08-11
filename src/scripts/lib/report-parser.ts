const LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;

export interface ParsedProject {
	name: string;
	category: string;
	status: string;
	pr_urls: string[];
	issue_urls: string[];
	release_url: string | null;
	drop_reason: string | null;
	notes: string | null;
}

type Category =
	| "integration"
	| "valkey_module"
	| "valkey_glide"
	| "valkey_docs_demos"
	| "infrastructure";
type Status = "in_progress" | "submitted" | "merged" | "completed" | "dropped";

function inferCategory(sectionTitle: string): Category {
	const lower = sectionTitle.toLowerCase();
	if (lower.includes("valkey module")) return "valkey_module";
	if (lower.includes("valkey glide")) return "valkey_glide";
	if (lower.includes("valkey docs") || lower.includes("valkey samples") || lower.includes("demos"))
		return "valkey_docs_demos";
	if (lower.includes("infrastructure")) return "infrastructure";
	return "integration";
}

function inferStatus(subsectionTitle: string): Status {
	const lower = subsectionTitle.toLowerCase();
	if (lower.includes("completed")) return "completed";
	if (lower.includes("merged")) return "merged";
	if (lower.includes("submitted")) return "submitted";
	if (lower.includes("dropped")) return "dropped";
	return "in_progress";
}

function extractLinks(cell: string): string[] {
	const urls: string[] = [];
	let match: RegExpExecArray | null = null;
	const regex = new RegExp(LINK_REGEX.source, "g");
	match = regex.exec(cell);
	while (match !== null) {
		urls.push(match[2]);
		match = regex.exec(cell);
	}
	return urls;
}

function parseTableRows(lines: string[]): string[][] {
	const rows: string[][] = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("|")) continue;
		// Skip separator rows
		if (trimmed.replace(/[|\s-:]/g, "") === "") continue;
		const cells = trimmed
			.split("|")
			.slice(1, -1)
			.map((c) => c.trim());
		rows.push(cells);
	}
	return rows;
}

export function parseStatusReport(markdown: string): ParsedProject[] {
	const projects: ParsedProject[] = [];
	const lines = markdown.split("\n");

	let currentCategory: Category = "integration";
	let currentStatus: Status = "in_progress";
	let inTable = false;
	let headerCells: string[] = [];
	const tableLines: string[] = [];

	function flushTable() {
		if (tableLines.length === 0) return;
		const rows = parseTableRows(tableLines);
		if (rows.length < 2) {
			tableLines.length = 0;
			return;
		}

		headerCells = rows[0].map((h) => h.toLowerCase());
		const dataRows = rows.slice(1);

		for (const cells of dataRows) {
			if (cells.length === 0) continue;

			const project = parseRow(cells, headerCells, currentCategory, currentStatus);
			if (project) projects.push(project);
		}
		tableLines.length = 0;
	}

	for (const line of lines) {
		// Detect section headings
		if (line.startsWith("## ")) {
			flushTable();
			inTable = false;
			currentCategory = inferCategory(line.slice(3));
			continue;
		}

		if (line.startsWith("### ")) {
			flushTable();
			inTable = false;
			currentStatus = inferStatus(line.slice(4));
			continue;
		}

		// Detect table
		if (line.trim().startsWith("|")) {
			inTable = true;
			tableLines.push(line);
		} else if (inTable && line.trim() === "") {
			flushTable();
			inTable = false;
		}
	}

	// Flush remaining table
	flushTable();

	return projects;
}

function parseRow(
	cells: string[],
	headers: string[],
	category: Category,
	status: Status,
): ParsedProject | null {
	const nameIdx = headers.findIndex((h) => h === "project" || h === "issue" || h === "name");
	if (nameIdx === -1 || !cells[nameIdx]) return null;

	const nameCell = cells[nameIdx];
	// Extract name — if it's a link, get the text; otherwise use raw
	const linkMatch = /^\[([^\]]+)\]/.exec(nameCell);
	const name = linkMatch ? linkMatch[1] : nameCell;
	if (!name.trim()) return null;

	const prIdx = headers.findIndex((h) => h === "prs" || h === "pr");
	const issueIdx = headers.findIndex((h) => h === "issues" || h === "issue");
	const releaseIdx = headers.findIndex((h) => h === "release");
	const reasonIdx = headers.findIndex((h) => h === "reason");
	const notesIdx = headers.findIndex((h) => h === "notes" || h === "description");

	const prUrls = prIdx >= 0 && cells[prIdx] ? extractLinks(cells[prIdx]) : [];
	const issueUrls = issueIdx >= 0 && cells[issueIdx] ? extractLinks(cells[issueIdx]) : [];
	const releaseLinks = releaseIdx >= 0 && cells[releaseIdx] ? extractLinks(cells[releaseIdx]) : [];
	const releaseUrl = releaseLinks.length > 0 ? releaseLinks[0] : null;
	const dropReason = reasonIdx >= 0 && cells[reasonIdx] ? cells[reasonIdx] : null;
	const notes = notesIdx >= 0 && cells[notesIdx] ? cells[notesIdx] : null;

	// For infrastructure, issue links go into issue_urls
	if (category === "infrastructure" && nameIdx === issueIdx) {
		const infraIssueUrls = extractLinks(nameCell);
		return {
			name: name.replace(/^#/, "").trim(),
			category,
			status,
			pr_urls: prUrls,
			issue_urls: infraIssueUrls,
			release_url: releaseUrl,
			drop_reason: dropReason,
			notes,
		};
	}

	return {
		name,
		category,
		status,
		pr_urls: prUrls,
		issue_urls: issueUrls,
		release_url: releaseUrl,
		drop_reason: dropReason,
		notes,
	};
}

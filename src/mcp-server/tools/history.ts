import type { StatliClient } from "../client.js";

interface ChangeHistoryEntry {
	id: string;
	project_id: string;
	field_changed: string;
	old_value: string | null;
	new_value: string | null;
	changed_by: string;
	reason: string | null;
	created_at: string;
}

export function getHistoryToolDefinitions() {
	return [
		{
			name: "get_change_history",
			description: "Get change history with optional filters",
			inputSchema: {
				type: "object",
				properties: {
					project_id: { type: "string", description: "Filter by project ID" },
					since: { type: "string", description: "ISO date — return entries after this date" },
				},
			},
		},
	];
}

export async function handleGetChangeHistory(client: StatliClient, args: Record<string, unknown>) {
	if (args.project_id) {
		const history = await client.get<ChangeHistoryEntry[]>(
			`/api/projects/${args.project_id}/history`,
		);
		return { content: [{ type: "text", text: JSON.stringify(history, null, 2) }] };
	}
	const params: Record<string, string> = {};
	if (args.since) params.since = args.since as string;
	const history = await client.get<ChangeHistoryEntry[]>("/api/history", params);
	return { content: [{ type: "text", text: JSON.stringify(history, null, 2) }] };
}

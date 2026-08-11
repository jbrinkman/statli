import type { StatliClient } from "../client.js";
import { handleGetChangeHistory } from "./history.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Project {
	id: string;
	name: string;
	[key: string]: unknown;
}

async function resolveProjectId(client: StatliClient, identifier: string): Promise<string> {
	if (UUID_REGEX.test(identifier)) {
		return identifier;
	}
	const projects = await client.get<Project[]>("/api/projects", { name: identifier });
	if (projects.length === 0) {
		throw new Error(`Project not found: ${identifier}`);
	}
	return projects[0].id;
}

function textResult(data: unknown) {
	return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export async function handleToolCall(
	client: StatliClient,
	name: string,
	args: Record<string, unknown>,
) {
	switch (name) {
		// Project tools
		case "list_projects": {
			const params: Record<string, string> = {};
			if (args.status) params.status = args.status as string;
			if (args.category) params.category = args.category as string;
			if (args.needs_review !== undefined) params.needs_review = String(args.needs_review);
			return textResult(await client.get("/api/projects", params));
		}
		case "get_project": {
			const id = await resolveProjectId(client, args.identifier as string);
			return textResult(await client.get(`/api/projects/${id}`));
		}
		case "create_project":
			return textResult(await client.post("/api/projects", args));
		case "update_project": {
			const { identifier, ...data } = args;
			const id = await resolveProjectId(client, identifier as string);
			return textResult(await client.put(`/api/projects/${id}`, data));
		}
		case "delete_project": {
			const id = await resolveProjectId(client, args.identifier as string);
			await client.delete(`/api/projects/${id}`);
			return textResult({ deleted: true });
		}
		case "lock_project": {
			const id = await resolveProjectId(client, args.identifier as string);
			return textResult(await client.post(`/api/projects/${id}/lock`));
		}
		case "unlock_project": {
			const id = await resolveProjectId(client, args.identifier as string);
			return textResult(await client.post(`/api/projects/${id}/unlock`));
		}

		// Review tools
		case "list_review_items": {
			if (args.project_id) {
				return textResult(await client.get(`/api/projects/${args.project_id}/reviews`));
			}
			const params: Record<string, string> = {};
			if (args.resolved !== undefined) params.resolved = String(args.resolved);
			if (args.type) params.type = args.type as string;
			return textResult(await client.get("/api/reviews", params));
		}
		case "add_review_item":
			return textResult(
				await client.post(`/api/projects/${args.project_id}/reviews`, {
					type: args.type,
					reason: args.reason,
				}),
			);
		case "resolve_review_item":
			return textResult(await client.post(`/api/reviews/${args.id}/resolve`));

		// History tool
		case "get_change_history":
			return await handleGetChangeHistory(client, args);

		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}

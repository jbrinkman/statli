import type { APIRoute } from "astro";
import { createdResponse, handleApiError, successResponse } from "../../../lib/api-utils.js";
import { getDb } from "../../../lib/db/connection.js";
import { createProject, listProjects } from "../../../lib/db/projects.js";
import { createProjectSchema, listProjectsFilterSchema } from "../../../lib/schemas/project.js";

export const GET: APIRoute = async ({ url }) => {
	try {
		const db = getDb();
		const params = Object.fromEntries(url.searchParams.entries());
		const filters = listProjectsFilterSchema.parse({
			...params,
			needs_review:
				params.needs_review === "true" ? true : params.needs_review === "false" ? false : undefined,
		});
		const projects = listProjects(db, filters);
		return successResponse(projects);
	} catch (error) {
		return handleApiError(error);
	}
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const db = getDb();
		const body = await request.json();
		const data = createProjectSchema.parse(body);
		const project = createProject(db, data);
		return createdResponse(project);
	} catch (error) {
		return handleApiError(error);
	}
};

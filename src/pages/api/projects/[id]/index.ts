import type { APIRoute } from "astro";
import { handleApiError, successResponse } from "../../../../lib/api-utils.js";
import { getDb } from "../../../../lib/db/connection.js";
import { deleteProject, getProject, updateProject } from "../../../../lib/db/projects.js";
import { NotFoundError } from "../../../../lib/errors.js";
import type { ChangedBy } from "../../../../lib/schemas/common.js";
import { updateProjectSchema } from "../../../../lib/schemas/project.js";

export const GET: APIRoute = async ({ params }) => {
	try {
		const db = getDb();
		const project = getProject(db, params.id as string);
		if (!project) throw new NotFoundError("Project not found");
		return successResponse(project);
	} catch (error) {
		return handleApiError(error);
	}
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
	try {
		const db = getDb();
		const body = await request.json();
		const data = updateProjectSchema.parse(body);
		const changedBy: ChangedBy = locals.user?.type === "machine" ? "system" : "user";
		const project = updateProject(db, params.id as string, data, changedBy);
		if (!project) throw new NotFoundError("Project not found");
		return successResponse(project);
	} catch (error) {
		return handleApiError(error);
	}
};

export const DELETE: APIRoute = async ({ params }) => {
	try {
		const db = getDb();
		const result = deleteProject(db, params.id as string);
		if (!result) throw new NotFoundError("Project not found");
		return successResponse({ deleted: true });
	} catch (error) {
		return handleApiError(error);
	}
};

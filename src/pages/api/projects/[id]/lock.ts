import type { APIRoute } from "astro";
import { handleApiError, successResponse } from "../../../../lib/api-utils.js";
import { getDb } from "../../../../lib/db/connection.js";
import { lockProject } from "../../../../lib/db/projects.js";
import { NotFoundError } from "../../../../lib/errors.js";
import type { ChangedBy } from "../../../../lib/schemas/common.js";

export const POST: APIRoute = async ({ params, locals }) => {
	try {
		const db = getDb();
		const changedBy: ChangedBy = locals.user?.type === "machine" ? "system" : "user";
		const project = lockProject(db, params.id as string, changedBy);
		if (!project) throw new NotFoundError("Project not found");
		return successResponse(project);
	} catch (error) {
		return handleApiError(error);
	}
};

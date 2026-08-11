import type { APIRoute } from "astro";
import { handleApiError, successResponse } from "../../../../lib/api-utils.js";
import { getDb } from "../../../../lib/db/connection.js";
import { getChangeHistory } from "../../../../lib/db/history.js";

export const GET: APIRoute = async ({ params }) => {
	try {
		const db = getDb();
		const history = getChangeHistory(db, params.id as string);
		return successResponse(history);
	} catch (error) {
		return handleApiError(error);
	}
};

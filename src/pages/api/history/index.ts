import type { APIRoute } from "astro";
import { handleApiError, successResponse } from "../../../lib/api-utils.js";
import { getDb } from "../../../lib/db/connection.js";
import { getChangeHistory } from "../../../lib/db/history.js";

export const GET: APIRoute = async ({ url }) => {
	try {
		const db = getDb();
		const since = url.searchParams.get("since") ?? undefined;
		const history = getChangeHistory(db, undefined, since);
		return successResponse(history);
	} catch (error) {
		return handleApiError(error);
	}
};

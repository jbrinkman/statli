import type { APIRoute } from "astro";
import { handleApiError, successResponse } from "../../../lib/api-utils.js";
import { getDb } from "../../../lib/db/connection.js";
import { getReviewItems } from "../../../lib/db/reviews.js";

export const GET: APIRoute = async ({ url }) => {
	try {
		const db = getDb();
		const params = Object.fromEntries(url.searchParams.entries());
		const filters: { resolved?: boolean; type?: string } = {};

		if (params.resolved === "true") filters.resolved = true;
		else if (params.resolved === "false") filters.resolved = false;
		if (params.type) filters.type = params.type;

		const items = getReviewItems(db, undefined, filters);
		return successResponse(items);
	} catch (error) {
		return handleApiError(error);
	}
};

import type { APIRoute } from "astro";
import { handleApiError, successResponse } from "../../../../lib/api-utils.js";
import { getDb } from "../../../../lib/db/connection.js";
import { resolveReviewItem } from "../../../../lib/db/reviews.js";
import { NotFoundError } from "../../../../lib/errors.js";

export const POST: APIRoute = async ({ params }) => {
	try {
		const db = getDb();
		const item = resolveReviewItem(db, params.id as string);
		if (!item) throw new NotFoundError("Review item not found");
		return successResponse(item);
	} catch (error) {
		return handleApiError(error);
	}
};

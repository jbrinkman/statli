import type { APIRoute } from "astro";
import { createdResponse, handleApiError, successResponse } from "../../../../lib/api-utils.js";
import { getDb } from "../../../../lib/db/connection.js";
import { addReviewItem, getReviewItems } from "../../../../lib/db/reviews.js";
import { createReviewItemSchema } from "../../../../lib/schemas/review.js";

export const GET: APIRoute = async ({ params }) => {
	try {
		const db = getDb();
		const items = getReviewItems(db, params.id as string);
		return successResponse(items);
	} catch (error) {
		return handleApiError(error);
	}
};

export const POST: APIRoute = async ({ params, request }) => {
	try {
		const db = getDb();
		const body = await request.json();
		const data = createReviewItemSchema.parse(body);
		const item = addReviewItem(db, params.id as string, data.type, data.reason);
		return createdResponse(item);
	} catch (error) {
		return handleApiError(error);
	}
};

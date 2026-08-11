import { z } from "zod";
import { reviewTypeEnum } from "./common.js";

export const createReviewItemSchema = z.object({
	type: reviewTypeEnum,
	reason: z.string().min(1),
});

export const listReviewItemsFilterSchema = z.object({
	resolved: z.boolean().optional(),
	type: reviewTypeEnum.optional(),
});

export type CreateReviewItemInput = z.infer<typeof createReviewItemSchema>;
export type ListReviewItemsFilter = z.infer<typeof listReviewItemsFilterSchema>;

export interface ReviewItem {
	id: string;
	project_id: string;
	type: string;
	reason: string;
	resolved: boolean;
	created_at: string;
	resolved_at: string | null;
}

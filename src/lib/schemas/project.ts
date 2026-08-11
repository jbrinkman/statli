import { z } from "zod";
import { categoryEnum, releaseModelEnum, statusEnum } from "./common.js";

export const createProjectSchema = z.object({
	name: z.string().min(1).max(200),
	category: categoryEnum,
	status: statusEnum.default("in_progress"),
	release_model: releaseModelEnum,
	release_model_confident: z.boolean().default(false),
	pr_urls: z.array(z.string().url()).default([]),
	issue_urls: z.array(z.string().url()).default([]),
	release_url: z.string().url().nullable().default(null),
	drop_reason: z.string().nullable().default(null),
	notes: z.string().nullable().default(null),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
	force: z.boolean().default(false),
});

export const listProjectsFilterSchema = z.object({
	status: statusEnum.optional(),
	category: categoryEnum.optional(),
	needs_review: z.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsFilter = z.infer<typeof listProjectsFilterSchema>;

export interface Project {
	id: string;
	name: string;
	category: string;
	status: string;
	release_model: string;
	release_model_confident: boolean;
	locked: boolean;
	pr_urls: string[];
	issue_urls: string[];
	release_url: string | null;
	drop_reason: string | null;
	notes: string | null;
	needs_review: boolean;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

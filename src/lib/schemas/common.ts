import { z } from "zod";

export const categoryEnum = z.enum([
	"integration",
	"valkey_module",
	"valkey_glide",
	"valkey_docs_demos",
	"infrastructure",
]);

export const statusEnum = z.enum(["in_progress", "submitted", "merged", "completed", "dropped"]);

export const releaseModelEnum = z.enum([
	"github_release",
	"merge_is_complete",
	"pypi",
	"npm",
	"nuget",
	"manual",
]);

export const changedByEnum = z.enum(["system", "user", "agent"]);

export const reviewTypeEnum = z.enum(["release_model", "status_change", "ambiguous_signal"]);

export type Category = z.infer<typeof categoryEnum>;
export type Status = z.infer<typeof statusEnum>;
export type ReleaseModel = z.infer<typeof releaseModelEnum>;
export type ChangedBy = z.infer<typeof changedByEnum>;
export type ReviewType = z.infer<typeof reviewTypeEnum>;

export function successResponse<T>(dataSchema: z.ZodType<T>) {
	return z.object({
		data: dataSchema,
	});
}

export const errorResponseSchema = z.object({
	error: z.object({
		message: z.string(),
		code: z.string(),
		details: z.unknown().optional(),
	}),
});

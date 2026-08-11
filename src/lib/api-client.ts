import type { ChangeHistoryEntry } from "./db/history.js";
import type { Project } from "./schemas/project.js";
import type { ReviewItem } from "./schemas/review.js";

interface ApiResult<T> {
	data: T | null;
	error: string | null;
}

async function fetchApi<T>(request: Request, path: string): Promise<ApiResult<T>> {
	try {
		const url = new URL(path, request.url);
		const response = await fetch(url.toString(), {
			headers: {
				cookie: request.headers.get("cookie") || "",
			},
		});
		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			return { data: null, error: body.error?.message || `HTTP ${response.status}` };
		}
		const body = await response.json();
		return { data: body.data as T, error: null };
	} catch (error) {
		return { data: null, error: (error as Error).message };
	}
}

export async function fetchProjects(
	request: Request,
	filters?: Record<string, string>,
): Promise<ApiResult<Project[]>> {
	let path = "/api/projects";
	if (filters) {
		const params = new URLSearchParams(filters);
		path += `?${params.toString()}`;
	}
	return fetchApi<Project[]>(request, path);
}

export async function fetchProjectReviews(
	request: Request,
	projectId: string,
): Promise<ApiResult<ReviewItem[]>> {
	return fetchApi<ReviewItem[]>(request, `/api/projects/${projectId}/reviews?resolved=false`);
}

export async function fetchHistory(
	request: Request,
	since?: string,
): Promise<ApiResult<ChangeHistoryEntry[]>> {
	const path = since ? `/api/history?since=${since}` : "/api/history";
	return fetchApi<ChangeHistoryEntry[]>(request, path);
}

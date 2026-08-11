import type { ParsedProject } from "./report-parser.js";

export type ReleaseModel =
	| "github_release"
	| "merge_is_complete"
	| "pypi"
	| "npm"
	| "nuget"
	| "manual";

export interface ReleaseModelResult {
	model: ReleaseModel;
	confident: boolean;
}

export function inferReleaseModel(project: ParsedProject): ReleaseModelResult {
	// Rule 1: release_url contains /releases/tag/ → github_release, confident
	if (project.release_url?.includes("/releases/tag/")) {
		return { model: "github_release", confident: true };
	}

	// Rule 2: category is valkey_docs_demos → merge_is_complete, confident
	if (project.category === "valkey_docs_demos") {
		return { model: "merge_is_complete", confident: true };
	}

	// Rule 3: PR URLs in valkey-io/ org AND status is merged → merge_is_complete, not confident
	if (project.status === "merged" && project.pr_urls.some((url) => url.includes("valkey-io/"))) {
		return { model: "merge_is_complete", confident: false };
	}

	// Rule 4: Any URL contains pypi.org → pypi, confident
	const allUrls = [...project.pr_urls, ...project.issue_urls, project.release_url].filter(
		Boolean,
	) as string[];
	if (allUrls.some((url) => url.includes("pypi.org"))) {
		return { model: "pypi", confident: true };
	}

	// Default: manual, not confident
	return { model: "manual", confident: false };
}

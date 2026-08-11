import { describe, expect, it } from "vitest";
import { inferReleaseModel } from "../../src/scripts/lib/release-model.js";
import type { ParsedProject } from "../../src/scripts/lib/report-parser.js";

function makeProject(overrides: Partial<ParsedProject> = {}): ParsedProject {
	return {
		name: "Test",
		category: "integration",
		status: "in_progress",
		pr_urls: [],
		issue_urls: [],
		release_url: null,
		drop_reason: null,
		notes: null,
		...overrides,
	};
}

describe("release model inference", () => {
	it("release_url with /releases/tag/ → github_release, confident", () => {
		const result = inferReleaseModel(
			makeProject({
				release_url: "https://github.com/org/repo/releases/tag/v1.0.0",
			}),
		);
		expect(result.model).toBe("github_release");
		expect(result.confident).toBe(true);
	});

	it("valkey_docs_demos category → merge_is_complete, confident", () => {
		const result = inferReleaseModel(makeProject({ category: "valkey_docs_demos" }));
		expect(result.model).toBe("merge_is_complete");
		expect(result.confident).toBe(true);
	});

	it("merged + valkey-io PR → merge_is_complete, not confident", () => {
		const result = inferReleaseModel(
			makeProject({
				status: "merged",
				pr_urls: ["https://github.com/valkey-io/valkey-glide/pull/5"],
			}),
		);
		expect(result.model).toBe("merge_is_complete");
		expect(result.confident).toBe(false);
	});

	it("pypi.org URL → pypi, confident", () => {
		const result = inferReleaseModel(
			makeProject({
				issue_urls: ["https://pypi.org/project/something/"],
			}),
		);
		expect(result.model).toBe("pypi");
		expect(result.confident).toBe(true);
	});

	it("no signals → manual, not confident", () => {
		const result = inferReleaseModel(makeProject());
		expect(result.model).toBe("manual");
		expect(result.confident).toBe(false);
	});

	it("priority: release_url wins over pypi URL", () => {
		const result = inferReleaseModel(
			makeProject({
				release_url: "https://github.com/org/repo/releases/tag/v2.0",
				issue_urls: ["https://pypi.org/project/x/"],
			}),
		);
		expect(result.model).toBe("github_release");
		expect(result.confident).toBe(true);
	});

	it("priority: release_url wins over valkey_docs_demos category", () => {
		const result = inferReleaseModel(
			makeProject({
				category: "valkey_docs_demos",
				release_url: "https://github.com/org/repo/releases/tag/v1.0",
			}),
		);
		expect(result.model).toBe("github_release");
		expect(result.confident).toBe(true);
	});

	it("no URLs, no special category → manual", () => {
		const result = inferReleaseModel(
			makeProject({ pr_urls: [], issue_urls: [], release_url: null }),
		);
		expect(result.model).toBe("manual");
		expect(result.confident).toBe(false);
	});
});

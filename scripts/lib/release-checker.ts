import { execSync } from "node:child_process";

export interface ReleaseCheckResult {
	found: boolean;
	releaseUrl?: string;
	releaseTag?: string;
	error?: string;
}

interface ReleaseEntry {
	tagName: string;
	publishedAt: string;
	url: string;
}

export function checkForRelease(repoSlug: string, prNumber: number): ReleaseCheckResult {
	try {
		const listOutput = execSync(
			`gh release list --repo "${repoSlug}" --json tagName,publishedAt,url --limit 20`,
			{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
		const releases: ReleaseEntry[] = JSON.parse(listOutput);

		if (releases.length === 0) {
			return { found: false };
		}

		// Sort oldest-first to find the FIRST release containing the PR
		const sorted = [...releases].sort(
			(a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
		);

		for (const release of sorted) {
			try {
				const viewOutput = execSync(
					`gh release view "${release.tagName}" --repo "${repoSlug}" --json body`,
					{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
				);
				const { body } = JSON.parse(viewOutput);
				if (body && mentionsPr(body, prNumber)) {
					return {
						found: true,
						releaseUrl: release.url,
						releaseTag: release.tagName,
					};
				}
			} catch {
				// Skip releases we can't view
				continue;
			}
		}

		return { found: false };
	} catch (error) {
		return { found: false, error: (error as Error).message };
	}
}

function mentionsPr(body: string, prNumber: number): boolean {
	// Match #1234 or pull/1234
	const patterns = [`#${prNumber}`, `pull/${prNumber}`];
	return patterns.some((p) => body.includes(p));
}

// Export for testing
export { mentionsPr };

import { execSync } from "node:child_process";

export interface PrState {
	state: "open" | "merged" | "closed";
	mergedAt: string | null;
	closedAt: string | null;
	comments: string[];
	error?: string;
}

export interface IssueState {
	state: "open" | "closed";
	comments: string[];
	error?: string;
}

export interface ClosureInterpretation {
	action: "dropped" | "needs_review";
	reason: string;
	confident: boolean;
}

const REJECTION_KEYWORDS = [
	"won't accept",
	"not accepting",
	"please publish separately",
	"closing as",
	"not aligned",
	"duplicate of",
	"not going to merge",
	"does not fit",
	"out of scope",
];

export function checkPrState(prUrl: string): PrState {
	try {
		const output = execSync(
			`gh pr view "${prUrl}" --json state,mergedAt,closedAt,comments`,
			{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
		const data = JSON.parse(output);
		return {
			state: data.state?.toLowerCase() === "merged" ? "merged" : data.state?.toLowerCase() === "open" ? "open" : "closed",
			mergedAt: data.mergedAt || null,
			closedAt: data.closedAt || null,
			comments: (data.comments || []).map((c: { body: string }) => c.body),
		};
	} catch (error) {
		return {
			state: "open",
			mergedAt: null,
			closedAt: null,
			comments: [],
			error: (error as Error).message,
		};
	}
}

export function checkIssueState(issueUrl: string): IssueState {
	try {
		const output = execSync(
			`gh issue view "${issueUrl}" --json state,comments`,
			{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
		const data = JSON.parse(output);
		return {
			state: data.state?.toLowerCase() === "open" ? "open" : "closed",
			comments: (data.comments || []).map((c: { body: string }) => c.body),
		};
	} catch (error) {
		return {
			state: "open",
			comments: [],
			error: (error as Error).message,
		};
	}
}

export function interpretClosure(prState: PrState): ClosureInterpretation {
	const allText = prState.comments.join("\n").toLowerCase();

	for (const keyword of REJECTION_KEYWORDS) {
		if (allText.includes(keyword)) {
			// Extract the comment containing the keyword as the reason
			const matchingComment = prState.comments.find((c) =>
				c.toLowerCase().includes(keyword),
			);
			return {
				action: "dropped",
				reason: matchingComment?.slice(0, 200) || `Closed: contains "${keyword}"`,
				confident: true,
			};
		}
	}

	// No clear rejection signal
	return {
		action: "needs_review",
		reason: "PR closed without clear rejection signal",
		confident: false,
	};
}

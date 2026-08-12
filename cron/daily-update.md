# Statli Daily Update

Run this at 8am ET daily. Use the `statli` MCP tools and `gh` CLI.

## Step 1: Check Submitted PRs

1. Call `list_projects` with `status: "submitted"`
2. For each project (skip if `locked: true` — log and move on):
   - Get the first PR URL from `pr_urls`
   - Run `gh pr view <url> --json state,mergedAt,closedAt,comments`
   - If `state === "merged"`: call `update_project` with `status: "merged"`
   - If `state === "closed"`: analyze comments for rejection keywords ("won't accept", "not accepting", "please publish separately", "closing as", "not aligned", "duplicate of")
     - If clear rejection: `update_project` with `status: "dropped"`, set `drop_reason`
     - If ambiguous: `update_project` with `status: "dropped"`, then `add_review_item` with type `ambiguous_signal`
   - If `state === "open"`: no action

## Step 2: Check Merged PRs for Releases

1. Call `list_projects` with `status: "merged"`
2. For projects with `release_model: "github_release"` (skip locked):
   - Extract repo slug and PR number from `pr_urls[0]`
   - Run `gh release list --repo <slug> --json tagName,publishedAt,url --limit 10`
   - For each release (oldest first): `gh release view <tag> --repo <slug> --json body`
   - If release body mentions the PR number (#N or pull/N):
     - Call `update_project` with `status: "completed"`, `release_url: <release_url>`

## Step 3: Auto-Promote merge_is_complete Projects

1. For projects with `release_model: "merge_is_complete"` and `status: "merged"`:
   - Call `update_project` with `status: "completed"`
   - These projects are complete once merged (no release to wait for)

## Step 4: Investigate Low-Confidence Release Models

1. Call `list_projects` — filter for `release_model_confident: false`
2. For each (skip locked):
   - Check repo for release patterns: `gh release list --repo <slug>`
   - If releases exist with version tags: update `release_model` to "github_release"
   - If no releases and it's a valkey-io PR: update to "merge_is_complete"
   - Add `add_review_item` if still uncertain

## Step 5: Check Issue Closures

1. For projects with `issue_urls`:
   - Run `gh issue view <url> --json state`
   - If closed: `add_review_item` with type `status_change`, reason "Associated issue closed"

## Step 6: Post Summary

Report:
- Number of projects checked
- Changes made (list each: "ProjectName: submitted → merged")
- Items flagged for review
- Errors encountered (per-project, don't stop on errors)

## Rules

- **Respect locks**: never update a locked project's status. Log it and flag for review.
- **Per-project errors**: if `gh` fails for one project, log the error and continue to the next.
- **Runtime limit**: target completion within 15 minutes. If taking too long, skip remaining low-priority checks (Step 4, Step 5) and note in summary.
- **Idempotency**: running twice should not create duplicate review items. Check before adding.

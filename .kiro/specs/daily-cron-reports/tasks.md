# Tasks: Daily Cron + Report Generation

> **Hard gate on every task:** Documentation MUST be updated before a task can be marked complete. Update the appropriate documentation:
> - **README.md** — human-facing: getting started, how to run, prerequisites
> - **`.kiro/steering/` files** — agent-facing: conventions, project structure, tool configs, constraints
>
> No duplication between the two. If a task adds something a developer would need to know about, the docs must reflect it.

## Task 1: Implement PR State Checker
_Requirements: 2_

- [ ] Create `scripts/lib/pr-checker.ts`:
  - Export `checkPrState(prUrl: string)` — calls `gh pr view <url> --json state,mergedAt,closedAt,comments` and returns parsed result
  - Export `checkIssueState(issueUrl: string)` — calls `gh issue view <url> --json state,comments` and returns parsed result
  - Export `interpretClosure(prState)` — analyzes comments for rejection signals (maintainer keywords: "won't accept", "not accepting", "please publish separately", "closing as", "not aligned", "duplicate of"), returns `{ action: 'dropped' | 'needs_review', reason: string, confident: boolean }`
  - Handle `gh` CLI errors gracefully (repo not found, auth expired) — return error state, don't throw
- [ ] Create `tests/fixtures/gh-pr-merged.json`, `gh-pr-closed.json`, `gh-pr-open.json` with realistic gh CLI output
- [ ] Create `tests/unit/scripts/pr-checker.test.ts`:
  - Test: merged PR returns state 'merged'
  - Test: closed PR with rejection comment returns action 'dropped' with extracted reason
  - Test: closed PR with ambiguous comment returns action 'needs_review'
  - Test: open PR returns state 'open' (no action)
  - Test: gh CLI error returns error state gracefully
- [ ] Update `.kiro/steering/project-conventions.md`: document pr-checker module and gh CLI dependency
- [ ] Verify: `npm run test` passes all pr-checker tests
- [ ] Commit: `feat: implement PR state checker with comment interpretation`

## Task 2: Implement Release Checker
_Requirements: 3_

- [ ] Create `scripts/lib/release-checker.ts`:
  - Export `checkForRelease(repoSlug: string, prNumber: number)` — calls `gh release list` then `gh release view` for each, checks if PR number appears in body
  - Sort releases oldest-first to find the FIRST release containing the PR
  - Return `{ found: boolean, releaseUrl?: string, releaseTag?: string }`
  - Handle gh CLI errors gracefully
- [ ] Create `tests/fixtures/gh-release-with-pr.json`, `gh-release-without-pr.json`
- [ ] Create `tests/unit/scripts/release-checker.test.ts`:
  - Test: release body containing `#1234` returns found=true with URL
  - Test: release body containing `pull/1234` returns found=true
  - Test: no release mentions PR returns found=false
  - Test: empty release list returns found=false
  - Test: multiple releases — returns the FIRST (oldest) match
- [ ] Verify: `npm run test` passes all release-checker tests
- [ ] Commit: `feat: implement release detection via gh CLI`

## Task 3: Implement Report Renderer
_Requirements: 6, 7_

- [ ] Create `scripts/lib/report-renderer.ts`:
  - Export `renderReport(data: ReportData)` — generates full markdown report
  - Render sections: Completed table, Merged table, Submitted table, Dropped table (with reasons), Valkey Samples table, Infrastructure section, This Week's Progress, placeholder sections (Summary, Risks, Next Week's Focus, Staffing)
  - Mark items with status change in last 7 days with **New** label
  - Calculate correct counts in section headers (e.g., "Completed Projects (31)")
  - Export `generateProgress(changes, projects)` — filter to integration activity only:
    - Include: submissions, merges, completions, drops, cookbook submissions
    - Exclude: general commentary, infrastructure, staffing
  - Format PR links as markdown links matching existing report style
- [ ] Create `tests/unit/scripts/report-renderer.test.ts`:
  - Test: completed table renders with project name, release link, correct count
  - Test: dropped table includes reason column
  - Test: "New" label applied to recently-changed items
  - Test: This Week's Progress includes only integration activity
  - Test: This Week's Progress excludes infrastructure and general items
  - Test: empty sections render gracefully (not omitted)
- [ ] Verify: `npm run test` passes all renderer tests
- [ ] Commit: `feat: implement weekly report markdown renderer`

## Task 4: Implement Report Generation Script
_Requirements: 6_

- [ ] Create `scripts/generate-report.ts`:
  - Import DAL directly (same codebase)
  - Query all projects grouped by status and category
  - Query change history for last 7 days
  - Call report renderer with the data
  - Accept CLI args: `--since <date>` (default: 7 days ago), `--output <path>` (default: stdout)
  - Output the rendered markdown
- [ ] Add npm script: `"report:generate": "npx tsx scripts/generate-report.ts"`
- [ ] Create `tests/integration/scripts/generate-report.test.ts`:
  - Seed test database with sample projects across all statuses
  - Run report generation
  - Assert output contains expected tables, counts, and formatting
- [ ] Update `README.md`: document `npm run report:generate` with usage and options
- [ ] Verify: `npm run report:generate` produces valid markdown output
- [ ] Commit: `feat: implement weekly report generation script`

## Task 5: Add Report Generation MCP Tool
_Requirements: 6_

- [ ] Add `generate_report` tool to MCP server (`mcp-server/tools/reports.ts`):
  - Input: optional `since` (ISO date), optional `output_path` (file path)
  - Calls the Statli API to fetch projects + history, then renders report
  - If `output_path` provided: write to file and return path
  - If not: return the rendered markdown as tool content
- [ ] Add unit test for the tool handler
- [ ] Verify: MCP tool lists `generate_report`; calling it returns markdown
- [ ] Commit: `feat: add report generation MCP tool`

## CHECKPOINT: Pause for human review
_At this point: PR checker, release checker, report renderer, report generation script, and MCP tool are all implemented and tested. Review before wiring up the daily cron._

## Task 6: Create Daily Cron Prompt
_Requirements: 1, 2, 3, 4, 5_

- [ ] Create `cron/daily-update.md` with structured instructions for the agent:
  - Step 1: Call `list_projects` with status `submitted` — for each, use `gh pr view` to check state. If merged → `update_project` to `merged`. If closed → interpret closure → `update_project` to `dropped` + `add_review_item`. Skip locked projects (log + flag).
  - Step 2: Call `list_projects` with status `merged`, release_model `github_release` — for each, extract repo slug + PR number from pr_urls, call release checker. If found → `update_project` to `completed` with release_url. Skip locked.
  - Step 3: Handle `merge_is_complete` projects — if status just changed to `merged`, auto-promote to `completed`.
  - Step 4: Call `list_projects` with `release_model_confident = false` — investigate repos via `gh release list`, README, etc. Update release_model with best guess. Flag if still uncertain.
  - Step 5: Check associated Issues for closures → flag as review items.
  - Step 6: Post summary: projects checked, changes made, items flagged, errors encountered.
  - Include guidance on respecting locks, handling errors per-project, and not exceeding 15-minute runtime.
- [ ] Update `.kiro/steering/project-conventions.md`: document the cron prompt location and purpose
- [ ] Verify: prompt file is clear, prescriptive, and covers all requirements
- [ ] Commit: `feat: add daily cron prompt for KiroCrew agent`

## Task 7: Register KiroCrew Cron Job
_Requirements: 1_

- [ ] Document in README the cron registration command:
  ```
  cron_add(name: "statli-daily-update", at_time: "8am", message: "Run the Statli daily update. Read ~/projects/statli/cron/daily-update.md and follow its instructions using the statli MCP tools and gh CLI.")
  ```
- [ ] Document in `.kiro/steering/project-conventions.md`: cron job name, schedule, dependencies (MCP server must be running, gh CLI must be authenticated)
- [ ] Note: actual cron registration happens manually by the user via KiroCrew — not automated by this spec
- [ ] Verify: documentation is clear enough for the user to register the cron
- [ ] Commit: `docs: document daily cron registration`

## Task 8: Write Integration Tests for Daily Logic
_Requirements: 8_

- [ ] Create `tests/unit/cron/daily-logic.test.ts`:
  - Test: submitted PR that is merged → project status updated to merged
  - Test: submitted PR that is closed with rejection → project moved to dropped with reason
  - Test: submitted PR that is closed ambiguously → project moved to dropped + review item created
  - Test: merged project with release found → promoted to completed with release_url
  - Test: merged project with no release → no change
  - Test: locked project with detected change → review item created, status unchanged
  - Test: `merge_is_complete` project merged → auto-promoted to completed
  - Test: project with release_model_confident=false → investigated
  - All tests mock `gh` CLI via fixture files
- [ ] Verify: `npm run test` passes; `npm run test:coverage` meets 80%
- [ ] Commit: `test: add integration tests for daily cron logic`

## Task 9: Final Documentation Pass
_Requirements: all_

- [ ] Update `README.md`:
  - Document the daily cron system (what it does, when it runs, what it needs)
  - Document `npm run report:generate` with full usage
  - Document prerequisites: `gh` CLI must be authenticated (`gh auth login`)
  - Document how to view cron results (KiroCrew dashboard notifications)
- [ ] Update `.kiro/steering/project-conventions.md`:
  - Document the full system architecture now that all specs are complete
  - Document the cron/, scripts/lib/ structure additions
  - Document the daily workflow (sources → MCP tools → API → SQLite → dashboard)
  - Document report generation approach (deterministic renderer, AI for narrative in future)
- [ ] Verify: all tests pass, all documented commands work, project builds and lints clean
- [ ] Commit: `docs: finalize documentation for daily cron and report generation`

## CHECKPOINT: Final review
_All requirements satisfied. Daily cron checks PR states, detects releases, respects locks, flags ambiguity. Report generation produces complete markdown drafts. Full Statli v2 system is operational end-to-end: data ingestion → database → dashboard → automated reports. System is ready for production use._

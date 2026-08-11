# Requirements: Daily Cron + Report Generation

## Goal

Implement the automated daily update cycle and weekly report generation for Statli v2. A KiroCrew cron job runs at 8am daily, checks external sources (GitHub PRs/Issues, releases) for status changes, updates the database, and flags ambiguous situations for human review. At the end of each week, the system generates a complete draft status report from the database's change history.

After this spec, the full Statli v2 system is operational end-to-end: data flows in daily from external sources, the dashboard shows live state, and weekly reports are generated automatically.

## Requirements

### 1. KiroCrew Cron Job Setup

**User Story:** As a product manager, I want an automated daily process that checks for project status changes, so that my dashboard stays current without manual intervention.

**Acceptance Criteria:**
- THE SYSTEM SHALL include a KiroCrew cron job configured to run daily at 8:00 AM Eastern
- THE SYSTEM SHALL use a KiroCrew agent session (LLM-powered) for the daily run — not a deterministic script — because the work requires AI judgment (interpreting PR comments, inferring intent from closures, etc.)
- THE SYSTEM SHALL include a cron skill or prompt file that instructs the agent on the daily workflow
- WHEN the cron fires THEN the agent SHALL use MCP tools (from Spec 3) to read and update project data
- THE SYSTEM SHALL complete the daily update within 15 minutes for up to 200 tracked projects
- IF the cron encounters an unrecoverable error THEN it SHALL notify the user via KiroCrew's notification system

### 2. GitHub PR Status Checking

**User Story:** As a product manager, I want submitted PRs automatically monitored for merges and closures, so that status changes are detected without me manually checking each repo.

**Acceptance Criteria:**
- FOR EACH project with status `submitted` THE SYSTEM SHALL check the PR state via `gh` CLI:
  - IF the PR is merged THEN move the project to `merged` status
  - IF the PR is closed without merge THEN analyze the closing comment and PR conversation:
    - IF the maintainer clearly rejected the contribution THEN move to `dropped` with extracted reason
    - IF the closure is ambiguous (DCO issue, replaced by another PR, etc.) THEN move to `dropped` with reason AND create a review item of type `status_change`
  - IF the PR is still open THEN no change
- THE SYSTEM SHALL check the latest comments on PRs for signals (rejection, request for changes, new PR created as replacement)
- THE SYSTEM SHALL use `gh pr view <url> --json state,mergedAt,closedAt,comments` for PR data
- THE SYSTEM SHALL use `gh issue view <url> --json state,comments` for Issue data
- FOR EACH project with associated Issues: IF an issue is closed THEN create a review item flagging the closure for human review

### 3. Release Detection

**User Story:** As a product manager, I want merged PRs automatically promoted to Completed when they appear in a release, so that the Completed table stays accurate.

**Acceptance Criteria:**
- FOR EACH project with status `merged` AND `release_model = 'github_release'`:
  - THE SYSTEM SHALL check the repo's releases via `gh release list --repo <owner/repo> --limit 5`
  - FOR EACH release THEN check if the PR number appears in the release body/notes via `gh release view <tag> --repo <owner/repo> --json body`
  - IF found THEN move the project to `completed` with `release_url` set to the release URL
- FOR EACH project with status `merged` AND `release_model = 'merge_is_complete'`:
  - THE SYSTEM SHALL automatically move to `completed` when the merge is detected (this happens in Requirement 2 — merge detection promotes directly to `completed` for these projects)
- THE SYSTEM SHALL check releases oldest-first so it finds the FIRST release containing the PR (not the latest)
- THE SYSTEM SHALL only poll releases for repos with merged PRs — not all tracked repos

### 4. Release Model Auto-Detection

**User Story:** As a product manager, I want the system to investigate new repos and determine how they handle releases, so that I don't have to manually configure each project's release model.

**Acceptance Criteria:**
- WHEN a new project is added to the database with `release_model_confident = false` THEN the daily cron SHALL investigate the repo:
  - Check if GitHub Releases exist (`gh release list --repo <owner/repo> --limit 1`)
  - Check if there are CI/CD workflows that suggest a release process
  - Check README/CONTRIBUTING docs for release information
- THE SYSTEM SHALL make a best-guess assignment to `release_model` based on findings
- THE SYSTEM SHALL set `release_model_confident = true` if evidence is clear, or leave it `false` and create a review item if uncertain
- THE SYSTEM SHALL NOT investigate repos that already have `release_model_confident = true`

### 5. Lock and Override Respect

**User Story:** As a product manager, I want the automation to respect my manual overrides, so that my curated statuses aren't overwritten by automated checks.

**Acceptance Criteria:**
- WHEN the daily cron encounters a locked project THEN it SHALL NOT change the project's status
- WHEN the daily cron encounters a locked project with new information (e.g., PR merged) THEN it SHALL create a review item noting the detected change without modifying the project
- THE SYSTEM SHALL log (at debug level) when it skips a locked project

### 6. Weekly Report Draft Generation

**User Story:** As a product manager, I want a complete weekly status report draft generated automatically from the database, so that I only need to review and add narrative rather than compiling tables manually.

**Acceptance Criteria:**
- THE SYSTEM SHALL include a report generation script/tool that produces a markdown status report draft
- THE SYSTEM SHALL generate the report in the same format as the existing weekly status reports (matching the style in `~/projects/weekly-reports/amazon-elasticache-agentic/2026-status-reports/`)
- THE SYSTEM SHALL generate the following sections from database state:
  - **Completed Projects** table — all projects with status `completed`
  - **Merged Projects** table — all projects with status `merged`
  - **Submitted Projects** table — all projects with status `submitted`
  - **Dropped Projects** table — all projects with status `dropped`, with reasons
  - **Valkey Samples** table — projects in `valkey_docs_demos` category
  - **Infrastructure** section — projects in `infrastructure` category
  - **This Week's Progress** — generated from change_history for the last 7 days (new submissions, merges, completions, drops, cookbook submissions ONLY — no general commentary)
  - **Risks** section — carried forward from previous report (template, not auto-generated)
  - **Next Week's Focus** — placeholder for manual entry or Jira integration
- THE SYSTEM SHALL mark items that changed this week with **New** labels in the tables
- THE SYSTEM SHALL calculate correct project counts for each section header
- THE SYSTEM SHALL output the draft to a configurable path (default: stdout)
- THE SYSTEM SHALL be invocable as: `npm run report:generate` or via MCP tool

### 7. This Week's Progress Rules

**User Story:** As a product manager, I want the progress section to follow my established rules about what belongs there, so that I don't have to manually filter out non-integration items.

**Acceptance Criteria:**
- THE SYSTEM SHALL include ONLY integration project activity in "This Week's Progress":
  - New PR submissions
  - Releases/completions (moved to Completed with release version)
  - Drops (project moved to Dropped)
  - Cookbook submissions to Valkey Samples
- THE SYSTEM SHALL NOT include in "This Week's Progress":
  - General project status commentary (TSC approvals, org hosting agreements)
  - Infrastructure/Terraform updates
  - Staffing changes
- EACH progress item SHALL include the project name, action taken, and relevant link (PR or release URL)

### 8. Testing

**User Story:** As a developer, I want the cron logic and report generation tested, so that automated updates don't corrupt data and reports are formatted correctly.

**Acceptance Criteria:**
- THE SYSTEM SHALL include unit tests for:
  - PR state interpretation logic (merged, closed-rejected, closed-ambiguous, still-open)
  - Release detection logic (PR number found in release body)
  - Release model auto-detection logic
  - Report generation (correct table format, correct section content, "New" labels)
  - This Week's Progress filtering rules
- THE SYSTEM SHALL include integration tests for:
  - Full daily update cycle against mocked `gh` CLI responses
  - Report generation from a seeded test database
- WHEN `npm run test:coverage` is run THEN coverage SHALL meet or exceed 80%
- THE SYSTEM SHALL use mocked `gh` CLI responses (not live GitHub calls) in tests

## Non-Functional Requirements

- **Performance:** Daily cron SHALL complete within 15 minutes for 200 tracked projects
- **Rate limiting:** THE SYSTEM SHALL respect GitHub's rate limits (use `gh` CLI's built-in rate limit handling)
- **Idempotency:** Running the daily cron twice on the same day SHALL NOT create duplicate changes (status already updated = no-op)
- **Observability:** THE SYSTEM SHALL log (via the agent's output) a summary of changes made during each run: N projects checked, M status changes, K review items created
- **Resilience:** IF a single project's check fails (e.g., repo deleted, gh auth expired) THEN the cron SHALL continue with remaining projects and report the failure at the end

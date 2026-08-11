# Design: Daily Cron + Report Generation

## Overview

This design implements the daily automated update cycle and weekly report generation. The daily cron is a KiroCrew agent session that uses MCP tools + `gh` CLI to check external sources and update the database. Report generation is a deterministic script that queries the database and outputs formatted markdown.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Daily Cron (8am ET)                          │
│                    KiroCrew Agent Session                       │
│                                                                │
│  1. List projects (submitted/merged) via MCP                   │
│  2. For each: check PR/Issue state via gh CLI                  │
│  3. For status changes: update via MCP tools                   │
│  4. For merged + github_release: check releases via gh CLI     │
│  5. For uncertain release models: investigate repo             │
│  6. Create review items for ambiguous situations               │
│  7. Log summary of changes                                     │
└────────────────────────────────────────────────────────────────┘
         │                              │
         │ MCP tools                    │ gh CLI
         ▼                              ▼
┌─────────────────┐          ┌──────────────────────┐
│  Statli API     │          │  GitHub API          │
│  (via MCP)      │          │  (via gh CLI)        │
└────────┬────────┘          └──────────────────────┘
         │
         ▼
┌─────────────────┐
│  SQLite         │
└─────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                Weekly Report Generation                         │
│                (npm run report:generate)                        │
│                                                                │
│  1. Query all projects grouped by status                       │
│  2. Query change history for last 7 days                       │
│  3. Render markdown tables matching status report format       │
│  4. Generate "This Week's Progress" from changes               │
│  5. Output to stdout or file                                   │
└────────────────────────────────────────────────────────────────┘
```

## Project Structure (additions to Spec 4)

```
statli/
├── cron/
│   └── daily-update.md          # Cron skill/prompt for the daily agent session
├── scripts/
│   ├── generate-report.ts       # Weekly report generator
│   └── lib/
│       ├── report-parser.ts     # (from Spec 3)
│       ├── release-model.ts     # (from Spec 3)
│       ├── pr-checker.ts        # PR/Issue state checking via gh CLI
│       ├── release-checker.ts   # Release detection via gh CLI
│       └── report-renderer.ts   # Markdown report template renderer
├── tests/
│   ├── unit/
│   │   ├── scripts/
│   │   │   ├── pr-checker.test.ts
│   │   │   ├── release-checker.test.ts
│   │   │   └── report-renderer.test.ts
│   │   └── cron/
│   │       └── daily-logic.test.ts
│   ├── integration/
│   │   └── scripts/
│   │       └── generate-report.test.ts
│   └── fixtures/
│       ├── gh-pr-merged.json
│       ├── gh-pr-closed.json
│       ├── gh-pr-open.json
│       ├── gh-release-with-pr.json
│       └── gh-release-without-pr.json
```

## Key Design Decisions

### 1. Daily Cron: Agent Session (Not Deterministic Script)

**Decision:** The daily cron is a KiroCrew agent session with a structured prompt, not a `script:` cron.

**Rationale:**
- PR comment interpretation requires AI judgment (is this a rejection? a DCO workaround?)
- Release model investigation requires reading docs and making inferences
- Edge cases are too varied to encode deterministically
- The MCP tools give the agent typed operations; the agent provides the reasoning

**Cron registration:**
```
cron_add(
  name: "statli-daily-update",
  at_time: "8am",
  message: "Run the Statli daily update. Read the prompt at ~/projects/statli/cron/daily-update.md and follow its instructions."
)
```

### 2. Daily Update Prompt Structure

**File: `cron/daily-update.md`**

The prompt instructs the agent to:
1. Call `list_projects` with status `submitted` — check each PR via `gh pr view`
2. Call `list_projects` with status `merged` and release_model `github_release` — check releases
3. Handle `merge_is_complete` projects (auto-promote on merge detection)
4. Check for projects with `release_model_confident = false` — investigate repos
5. Respect locked projects (skip, optionally flag)
6. Summarize: X checked, Y changed, Z flagged

### 3. PR State Checking Logic

**Module: `scripts/lib/pr-checker.ts`**

```typescript
import { execSync } from 'child_process';

interface PrState {
  state: 'open' | 'merged' | 'closed';
  mergedAt: string | null;
  closedAt: string | null;
  lastComments: Comment[];
}

export function checkPrState(prUrl: string): PrState {
  const json = execSync(
    `gh pr view "${prUrl}" --json state,mergedAt,closedAt,comments`,
    { encoding: 'utf-8' }
  );
  return JSON.parse(json);
}

export function interpretClosure(pr: PrState): {
  action: 'dropped' | 'needs_review';
  reason: string;
  confident: boolean;
} {
  // Look for maintainer comments with rejection signals
  const lastMaintainerComment = findLastMaintainerComment(pr.lastComments);

  if (lastMaintainerComment) {
    const signals = ['won\'t accept', 'not accepting', 'please publish separately',
                     'closing as', 'not aligned', 'duplicate of'];
    const isRejection = signals.some(s =>
      lastMaintainerComment.body.toLowerCase().includes(s)
    );

    if (isRejection) {
      return {
        action: 'dropped',
        reason: extractReasonFromComment(lastMaintainerComment.body),
        confident: true,
      };
    }
  }

  // Ambiguous — flag for review
  return {
    action: 'needs_review',
    reason: `PR closed without merge. Last comment: "${truncate(lastComment?.body, 200)}"`,
    confident: false,
  };
}
```

The agent uses this module's logic but applies additional AI judgment for edge cases.

### 4. Release Detection Logic

**Module: `scripts/lib/release-checker.ts`**

```typescript
export function checkForRelease(repoSlug: string, prNumber: number): {
  found: boolean;
  releaseUrl?: string;
  releaseTag?: string;
} {
  // Get recent releases (oldest first for correct match)
  const releases = JSON.parse(execSync(
    `gh release list --repo ${repoSlug} --limit 10 --json tagName,publishedAt`,
    { encoding: 'utf-8' }
  ));

  // Sort oldest first
  releases.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

  for (const release of releases) {
    const body = execSync(
      `gh release view ${release.tagName} --repo ${repoSlug} --json body`,
      { encoding: 'utf-8' }
    );
    const { body: releaseBody } = JSON.parse(body);

    // Check if PR number appears in release notes
    if (releaseBody.includes(`#${prNumber}`) ||
        releaseBody.includes(`pull/${prNumber}`)) {
      return {
        found: true,
        releaseUrl: `https://github.com/${repoSlug}/releases/tag/${release.tagName}`,
        releaseTag: release.tagName,
      };
    }
  }

  return { found: false };
}
```

### 5. Report Generation

**Module: `scripts/lib/report-renderer.ts`**

Deterministic template rendering — no AI needed. Queries the database and formats markdown tables.

```typescript
export function renderReport(data: ReportData): string {
  const sections = [
    renderHeader(data.date),
    renderSummaryPlaceholder(),
    renderCompletedTable(data.completed),
    renderMergedTable(data.merged),
    renderSubmittedTable(data.submitted),
    renderDroppedTable(data.dropped),
    renderValkeySamplesTable(data.valkeySamples),
    renderThisWeekProgress(data.changes),
    renderNextWeekPlaceholder(),
    renderRisksPlaceholder(),
    renderInfrastructureSection(data.infrastructure),
    renderStaffingPlaceholder(),
    renderGoals(),
  ];

  return sections.join('\n\n');
}
```

**"New" label logic:**
```typescript
function isNew(project: Project, changes: ChangeHistory[]): boolean {
  return changes.some(c =>
    c.project_id === project.id &&
    c.field_changed === 'status' &&
    c.new_value === project.status
  );
}
```

### 6. This Week's Progress Generation

Follows the established rules (from learned corrections):

```typescript
export function generateProgress(changes: ChangeHistory[], projects: Map<string, Project>): string[] {
  const items: string[] = [];

  for (const change of changes) {
    if (change.field_changed !== 'status') continue;
    const project = projects.get(change.project_id);
    if (!project) continue;

    // Only integration activity
    switch (change.new_value) {
      case 'submitted':
        items.push(`${project.name} submitted — ${formatPrLinks(project.pr_urls)}.`);
        break;
      case 'completed':
        items.push(`${project.name} released in [${extractVersion(project.release_url)}](${project.release_url}).`);
        break;
      case 'dropped':
        items.push(`${project.name} dropped — ${project.drop_reason}.`);
        break;
      case 'merged':
        items.push(`${project.name} merged — ${formatPrLinks(project.pr_urls)}.`);
        break;
    }
  }

  return items;
}
```

### 7. Lock Handling in Daily Cron

The cron prompt instructs the agent:
1. Before updating any project, check if `locked === true`
2. If locked and a change is detected → create a review item:
   ```
   type: 'status_change'
   reason: 'Detected PR merged for locked project [name]. Current status: submitted. Suggested: merged. Skipped due to lock.'
   ```
3. Continue to next project

### 8. Cron Error Handling

- Per-project errors are caught and accumulated
- The cron continues processing remaining projects
- At the end, the agent posts a summary:
  ```
  Daily update complete: 45 projects checked, 3 status changes, 1 review item created, 2 errors (DSPy: repo not found, MetaGPT: gh auth expired)
  ```
- If the entire run fails (e.g., MCP server unreachable), notify the user immediately

## Testing Strategy

**Unit tests (mocked `gh` CLI):**
- PR checker: provide fixture JSON → assert correct state interpretation
- Release checker: provide fixture release bodies → assert PR detection
- Report renderer: provide project data → assert correct markdown output
- Progress generator: provide change history → assert only integration activity included

**Integration tests:**
- Report generation: seed test database → run `npm run report:generate` → validate output structure and content
- Mock the `gh` CLI for daily cron tests by providing fixture files and stubbing `execSync`

**Fixtures:**
- `gh-pr-merged.json` — PR in merged state
- `gh-pr-closed.json` — PR closed with rejection comment
- `gh-pr-open.json` — PR still open
- `gh-release-with-pr.json` — release body mentioning PR #1234
- `gh-release-without-pr.json` — release body without the target PR

## MCP Tool for Report Generation

In addition to the npm script, expose report generation as an MCP tool:

```typescript
// Added to mcp-server/tools/
{
  name: 'generate_report',
  description: 'Generate a weekly status report draft from the database',
  inputSchema: {
    type: 'object',
    properties: {
      since: { type: 'string', description: 'ISO date for the start of the reporting period (default: 7 days ago)' },
      output_path: { type: 'string', description: 'File path to write the report (default: stdout)' },
    },
  },
}
```

This lets the agent generate reports on demand during manual sessions, not just via the weekly script.

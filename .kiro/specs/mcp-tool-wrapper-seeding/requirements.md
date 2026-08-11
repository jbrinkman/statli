# Requirements: MCP Tool Wrapper + Data Seeding

## Requirement 1: MCP Server Setup

### User Story
As a KiroCrew agent, I need a dedicated MCP server that connects to the Statli API so I can manage projects through natural language tool invocations.

### Acceptance Criteria
- MCP server is a standalone Node.js process using `@modelcontextprotocol/sdk`
- Server uses `StdioServerTransport` for communication with KiroCrew
- Server is registered in KiroCrew MCP config (`~/.kiro/crew/mcp.json`)
- Authenticates to Statli API via Bearer API key in `Authorization` header
- Existing auth middleware is extended to accept either Better Auth session OR API key (both grant full `/api/*` access)
- API key is read from `STATLI_API_KEY` environment variable (configurable, not hardcoded)
- Server validates connection to Statli API on startup (fails fast if unreachable or unauthorized)
- API base URL is configurable via `STATLI_API_URL` env var (default: `http://127.0.0.1:4321`)

## Requirement 2: Project Management Tools

### User Story
As a KiroCrew agent, I need tools to create, read, update, and delete projects so I can manage the project tracker through MCP.

### Acceptance Criteria
- `list_projects` tool with optional filters: status, category, needs_review
- `get_project` tool accepts project ID (UUID) or project name for lookup
- `create_project` tool with required fields (name, category, status) and optional fields (pr_urls, issue_urls, release_url, release_model)
- `update_project` tool accepts project ID or name, with partial update support
- `delete_project` tool (soft-delete) accepts project ID or name
- `lock_project` tool prevents automated status changes
- `unlock_project` tool re-enables automated status changes
- All tools return structured data (JSON in text content)
- Attempting to change status on a locked project returns an explicit error (not silent failure)
- Name-based lookup uses UUID regex check to distinguish ID from name, falls back to name query param

## Requirement 3: Review Item Tools

### User Story
As a KiroCrew agent, I need tools to manage review items so I can flag ambiguous data and track resolution.

### Acceptance Criteria
- `list_review_items` tool with optional filters: project_id, resolved (boolean), type
- `add_review_item` tool with required fields: project_id, type, reason
- `resolve_review_item` tool accepts review item ID and optional resolution_note
- `add_review_item` returns the created item with its ID
- Valid types: `status_mismatch`, `ambiguous_signal`, `release_model_uncertain`, `manual_override`

## Requirement 4: History Tools

### User Story
As a KiroCrew agent, I need to query change history so I can generate reports and understand project evolution.

### Acceptance Criteria
- `get_change_history` tool with optional filters: project_id, since (ISO date string)
- Without project_id, returns history across all projects
- Results ordered by timestamp descending
- Returns: project name, field changed, old value, new value, changed_by, timestamp

## Requirement 5: Status Report Parsing (Seed)

### User Story
As a system administrator, I need to bootstrap the database from existing weekly status reports so the tracker starts with accurate historical data.

### Acceptance Criteria
- Parses the latest weekly status report markdown file
- Extracts projects from all tables: Completed, Merged, Submitted, Dropped, Valkey Samples, Infrastructure
- For each project extracts: name, category (inferred from section), status (mapped from table), pr_urls, issue_urls, release_url, drop_reason (if applicable)
- Handles Infrastructure section's unique table format (different columns)
- Assigns `release_model` via heuristics:
  - Release URL containing `/releases/tag/` → `github_release`
  - Category `valkey_docs_demos` → `merge_is_complete`
  - Merged in `valkey-io/` org → `merge_is_complete` (low confidence)
  - PyPI link present → `pypi`
  - Default: `manual` (low confidence + creates review item)
- Idempotent: no duplicate projects on re-run (matches by normalized name)
- Runnable as `npm run seed`
- Completes in under 30 seconds for ~150 projects

## Requirement 6: Data Validation Against External Sources

### User Story
As a system administrator, I need to validate seeded data against Confluence so I can identify discrepancies and ensure accuracy.

### Acceptance Criteria
- Compares seeded database projects against Confluence PR Status Tracker
- Flags missing projects (in Confluence but not DB) as review items with type `ambiguous_signal`
- Flags status discrepancies (different status in Confluence vs DB) as review items
- Uses Atlassian CLI via shell commands for Confluence access
- Runnable as `npm run validate:sources`
- NEVER auto-changes data — only creates review items for human review
- Graceful error handling if Atlassian CLI is unavailable (logs warning, exits cleanly)
- Safe to re-run (does not create duplicate review items for same discrepancy)

## Requirement 7: Testing

### User Story
As a developer, I need comprehensive tests so I can refactor with confidence and catch regressions.

### Acceptance Criteria
- Unit tests for all MCP tool handlers with mocked API client
- Unit tests for report parser with markdown fixture based on real report format
- Unit tests for release model inference (parametrized across all heuristic rules)
- Integration test for MCP server startup and tool listing (spawn process, connect, verify)
- Integration test for seed script execution against test database
- 80% code coverage minimum across all new code
- All tests pass with `npm test`

## Non-Functional Requirements

- Seed script completes in under 30 seconds for ~150 projects
- Both seed and validate scripts are idempotent and safe to re-run
- Graceful degradation if Atlassian CLI is unavailable
- MCP server logs all tool invocations at debug level
- All errors include actionable context (tool name, project identifier, HTTP status)

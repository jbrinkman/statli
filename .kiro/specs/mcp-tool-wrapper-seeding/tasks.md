# Tasks: MCP Tool Wrapper + Data Seeding

> ⚠️ **HARD GATE**: Every task MUST update relevant documentation (README.md for humans, .kiro/steering/ for agents) before the task is considered complete. No exceptions.

## Task 1: Add API Key Auth to Middleware

### Steps
1. Add `STATLI_API_KEY` to `.env` and `.env.example`:
   ```
   STATLI_API_KEY=dev-api-key-change-in-production
   ```
2. Update `src/env.d.ts` to declare `STATLI_API_KEY` in `ImportMetaEnv`
3. Extend `src/middleware.ts`:
   - Before the Better Auth session check, extract `Authorization` header
   - If header starts with `Bearer `, compare token against `import.meta.env.STATLI_API_KEY`
   - If match: call `next()` (skip session check)
   - If no Bearer header or mismatch: fall through to existing Better Auth logic
   - Ensure auth bypass routes (e.g., `/api/auth/*`) remain bypassed
4. Add unit test `tests/unit/middleware-apikey.test.ts`:
   - Test: valid API key → 200
   - Test: invalid API key → falls through to session check → 401
   - Test: no auth header → falls through to session check → 401
   - Test: auth bypass routes still bypassed
5. Run `npm test` — all tests pass
6. Update `.kiro/steering/api-conventions.md` to document dual auth mechanism
7. Commit: `feat(auth): extend middleware to accept Bearer API key`

### Verify
- `npm test` passes
- Manual curl with `Authorization: Bearer dev-api-key-change-in-production` returns 200 from a protected endpoint
- Manual curl without header returns 401

## Task 2: Add Name Filter to GET /api/projects

### Steps
1. Update `GET /api/projects` endpoint to accept optional `name` query parameter
2. When `name` param is present, filter projects by exact name match (case-insensitive)
3. Add DAL function `getProjectByName(db, name)` if not already present
4. Add Zod schema for the query params (extend existing if applicable)
5. Add unit test for name filter:
   - Test: `?name=LocalAI` returns matching project
   - Test: `?name=nonexistent` returns empty array
   - Test: case-insensitive match works
6. Run `npm test` — all tests pass
7. Commit: `feat(api): add name query filter to GET /api/projects`

### Verify
- `npm test` passes
- `curl http://127.0.0.1:4321/api/projects?name=TestProject` returns filtered results

## Task 3: Create MCP Server Skeleton

### Steps
1. Install dependency: `npm install @modelcontextprotocol/sdk`
2. Create `src/mcp-server/index.ts`:
   ```typescript
   import { Server } from "@modelcontextprotocol/sdk/server/index.js";
   import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
   import { StatliClient } from "./client.js";

   const apiUrl = process.env.STATLI_API_URL || "http://127.0.0.1:4321";
   const apiKey = process.env.STATLI_API_KEY;
   if (!apiKey) { console.error("STATLI_API_KEY required"); process.exit(1); }

   const client = new StatliClient(apiUrl, apiKey);
   await client.healthCheck(); // Validate connection on start

   const server = new Server(
     { name: "statli", version: "1.0.0" },
     { capabilities: { tools: {} } }
   );
   // Tool registration will be added in subsequent tasks
   const transport = new StdioServerTransport();
   await server.connect(transport);
   ```
3. Create `src/mcp-server/client.ts`:
   - Export `StatliClient` class with constructor(baseUrl, apiKey)
   - Methods: `get<T>(path, params?)`, `post<T>(path, body)`, `patch<T>(path, body)`, `delete(path)`
   - All methods add `Authorization: Bearer ${apiKey}` header
   - `healthCheck()` method: `GET /api/projects?limit=1`, throws if non-200
   - Error handling: throw typed errors with status code and message
4. Add `tsconfig.mcp.json` for MCP server build (separate from Astro's tsconfig):
   - Target: ESNext, Module: NodeNext, outDir: dist/mcp-server
5. Add npm scripts to `package.json`:
   ```json
   "build:mcp": "tsc -p tsconfig.mcp.json",
   "start:mcp": "node dist/mcp-server/index.js"
   ```
6. Add integration test `tests/integration/mcp-server.test.ts`:
   - Spawn MCP server process with test env vars
   - Connect via stdio using SDK client
   - Call `tools/list` — verify response (empty tools list for now)
   - Kill process after test
7. Run `npm test` — all tests pass
8. Update README.md with MCP server build/run instructions
9. Commit: `feat(mcp): create MCP server skeleton with API client`

### Verify
- `npm run build:mcp` succeeds
- `STATLI_API_KEY=test npm run start:mcp` starts without error (exits if API unreachable, which is expected without server running)
- `npm test` passes

## Task 4: Implement Project Management Tools

### Steps
1. Create `src/mcp-server/tools/projects.ts`:
   - Export `registerProjectTools(server, client)` function
   - Implement tools: `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`, `lock_project`, `unlock_project`
   - Each tool has `inputSchema` (JSON Schema) and handler
   - `get_project`, `update_project`, `delete_project`, `lock_project`, `unlock_project` accept `identifier` param — use UUID regex to determine ID vs name lookup
   - `list_projects` accepts optional `status`, `category`, `needs_review` filters
   - Lock/unlock: `PATCH /api/projects/:id` with `{ locked: true/false }`
   - Error on locked status change: check `locked` field in response before update, or handle 409 from API
2. Register tools in `src/mcp-server/index.ts`: `registerProjectTools(server, client)`
3. Add unit tests `tests/unit/tools/projects.test.ts`:
   - Mock `StatliClient` for each tool
   - Test list with filters
   - Test get by UUID vs name
   - Test create with required + optional fields
   - Test update returns success
   - Test delete (soft-delete) returns success
   - Test lock/unlock
   - Test error on locked project status change
4. Run `npm test` — all tests pass
5. Commit: `feat(mcp): implement project management tools`

### Verify
- `npm test` passes
- Integration test updated: `tools/list` now shows 7 project tools

## Task 5: Implement Review Item and History Tools

### Steps
1. Create `src/mcp-server/tools/reviews.ts`:
   - Export `registerReviewTools(server, client)`
   - Implement: `list_review_items` (filters: project_id, resolved, type), `add_review_item` (project_id, type, reason), `resolve_review_item` (id, resolution_note?)
   - Valid types enforced: `status_mismatch`, `ambiguous_signal`, `release_model_uncertain`, `manual_override`
2. Create `src/mcp-server/tools/history.ts`:
   - Export `registerHistoryTools(server, client)`
   - Implement: `get_change_history` (filters: project_id?, since?)
   - `since` accepts ISO date string
3. Register both in `src/mcp-server/index.ts`
4. Add unit tests `tests/unit/tools/reviews.test.ts`:
   - Test list with each filter
   - Test add returns created item with ID
   - Test resolve with and without note
   - Test invalid type returns error
5. Add unit tests `tests/unit/tools/history.test.ts`:
   - Test with project_id filter
   - Test with since date filter
   - Test without filters returns all
6. Run `npm test` — all tests pass
7. Commit: `feat(mcp): implement review item and history tools`

### Verify
- `npm test` passes
- Integration test: `tools/list` shows all 11 tools (7 project + 3 review + 1 history)

## Task 6: MCP Integration Test + Tool Listing Verification

### Steps
1. Update `tests/integration/mcp-server.test.ts`:
   - Start Astro dev server in background (or use test database with seeded data)
   - Spawn MCP server with valid API key
   - Connect via stdio client
   - Call `tools/list` — verify all 11 tools present with correct inputSchemas
   - Call `list_projects` — verify structured response
   - Call `get_project` with non-existent name — verify error format `{ isError: true }`
   - Tear down both processes
2. Run `npm test` — all tests pass
3. Commit: `test(mcp): add full integration test for MCP tool listing and invocation`

### Verify
- `npm test` passes with integration tests
- Coverage report shows MCP server code at ≥80%

---

## CHECKPOINT: MCP Server Complete

**Stop here and wait for user review.** The MCP server with all tools is implemented and tested. User should verify:
- Tool list matches requirements
- Auth mechanism works correctly
- Error responses are well-structured
- Integration test is comprehensive

---

## Task 7: Implement Report Parser

### Steps
1. Create `src/scripts/lib/report-parser.ts`:
   - Export `parseStatusReport(markdown: string): ParsedProject[]`
   - Split by `## ` headings to identify sections
   - Identify tables by detecting `|---|` separator lines
   - Parse header row to determine column positions
   - For each data row: extract cell values, apply `LINK_REGEX` to extract URLs
   - Category inference:
     - "Integration" section → category from project name pattern or default `integration`
     - "Valkey Module" → `valkey_module`
     - "Valkey Glide" → `valkey_glide`
     - "Valkey Samples" / "Docs" / "Demos" → `valkey_docs_demos`
     - "Infrastructure" → `infrastructure`
   - Status mapping: section/table heading determines status (`Completed` → `completed`, `Merged` → `merged`, etc.)
   - Handle Infrastructure's unique format (different column names/order)
   - Extract `drop_reason` from Dropped table's reason column
2. Create `tests/fixtures/sample-report.md`:
   - Include all table types with 2-3 entries each
   - Include edge cases: multi-link cells, empty cells, special characters in names
3. Add unit tests `tests/unit/report-parser.test.ts`:
   - Test each section type parses correctly
   - Test link extraction (single link, multiple links, no links)
   - Test category inference for each section
   - Test status mapping
   - Test Infrastructure unique format
   - Test empty table handling
   - Test malformed row handling (skip gracefully)
4. Run `npm test` — all tests pass
5. Commit: `feat(scripts): implement deterministic status report parser`

### Verify
- `npm test` passes
- Parser correctly extracts all projects from fixture

## Task 8: Implement Release Model Inference

### Steps
1. Create `src/scripts/lib/release-model.ts`:
   - Export `inferReleaseModel(project: ParsedProject): { model: ReleaseModel, confident: boolean }`
   - Type `ReleaseModel = "github_release" | "merge_is_complete" | "pypi" | "manual"`
   - Rules (in priority order):
     1. `release_url` contains `/releases/tag/` → `{ model: "github_release", confident: true }`
     2. Category is `valkey_docs_demos` → `{ model: "merge_is_complete", confident: true }`
     3. Any `pr_urls` in `valkey-io/` org AND status is `merged` → `{ model: "merge_is_complete", confident: false }`
     4. Any URL contains `pypi.org` → `{ model: "pypi", confident: true }`
     5. Default → `{ model: "manual", confident: false }`
2. Add unit tests `tests/unit/release-model.test.ts`:
   - Parametrized tests for each rule
   - Test priority order (e.g., project with both release URL and pypi link → github_release wins)
   - Test edge cases: no URLs, empty strings
3. Run `npm test` — all tests pass
4. Commit: `feat(scripts): implement release model heuristic inference`

### Verify
- `npm test` passes
- All heuristic branches have test coverage

## Task 9: Implement Seed Script

### Steps
1. Create `src/scripts/seed.ts`:
   - Import DAL functions directly (same codebase)
   - Accept optional `--report-path` argument (default: discover latest in status reports repo)
   - Read and parse report with `parseStatusReport()`
   - For each parsed project:
     - Normalize name (lowercase, trim, collapse whitespace)
     - Check `getProjectByName(db, normalizedName)` — skip if exists
     - Call `createProject(db, { ... })` with mapped fields
     - If `!releaseModelResult.confident`: create review item `release_model_uncertain`
   - Log summary: "Seeded X new, Y skipped (existing), Z failed"
   - Exit code 1 if any failures, 0 otherwise
2. Add npm script: `"seed": "tsx src/scripts/seed.ts"`
3. Add integration test `tests/integration/seed.test.ts`:
   - Use temporary SQLite database
   - Run seed against fixture report
   - Verify correct project count created
   - Verify no duplicates on second run (idempotent)
   - Verify review items created for low-confidence models
4. Run `npm test` — all tests pass
5. Update README.md: document `npm run seed` usage and options
6. Commit: `feat(scripts): implement database seed from status report`

### Verify
- `npm test` passes
- `npm run seed -- --report-path tests/fixtures/sample-report.md` completes successfully
- Running seed twice produces same DB state (idempotent)

## Task 10: Implement Validation Script

### Steps
1. Create `src/scripts/validate.ts`:
   - Check Atlassian CLI availability: `which atlas` or `atlas --version` — if unavailable, log warning and exit 0
   - Fetch Confluence page: `atlas confluence page get --space <KEY> --title "PR Status Tracker" --output-format html`
   - Parse HTML table: extract project names and statuses (simple regex or string matching)
   - For each Confluence project:
     - Query Statli API: `GET /api/projects?name=<name>` (use StatliClient or direct fetch)
     - If not found: create review item `ambiguous_signal` with reason "Found in Confluence but missing from DB"
     - If found but status differs: create review item `status_mismatch` with reason detailing both statuses
   - Idempotency: before creating review item, check if identical one exists (match on project_id + type + reason substring)
   - Log summary: "Validated X projects. Y new discrepancies flagged."
2. Add npm script: `"validate:sources": "tsx src/scripts/validate.ts"`
3. Add unit test for HTML parsing logic (separate from CLI dependency):
   - Test: HTML table with known entries → correct parsed output
   - Test: empty table → no errors
4. Add integration test (mocked CLI output):
   - Test: discrepancies detected → review items created
   - Test: re-run with same data → no duplicate review items
   - Test: CLI unavailable → graceful exit
5. Run `npm test` — all tests pass
6. Update README.md: document `npm run validate:sources` usage
7. Commit: `feat(scripts): implement data validation against Confluence`

### Verify
- `npm test` passes
- Script exits cleanly with warning if Atlassian CLI not installed

## Task 11: Register MCP Server in KiroCrew Config

### Steps
1. Read current `~/.kiro/crew/mcp.json` (or create if not exists)
2. Add `statli` entry:
   ```json
   {
     "statli": {
       "command": "node",
       "args": ["dist/mcp-server/index.js"],
       "cwd": "~/projects/statli",
       "env": {
         "STATLI_API_KEY": "${STATLI_API_KEY}",
         "STATLI_API_URL": "http://127.0.0.1:4321"
       }
     }
   }
   ```
3. Verify MCP server builds cleanly: `npm run build:mcp`
4. Add setup instructions to README.md:
   - How to set `STATLI_API_KEY` environment variable
   - How to verify MCP server is registered
   - How to test connection
5. Update `.kiro/steering/infrastructure.md` with MCP server operational notes
6. Commit: `chore: register MCP server in KiroCrew config`

### Verify
- `~/.kiro/crew/mcp.json` has valid `statli` entry
- `npm run build:mcp` succeeds
- README has complete setup instructions

## Task 12: Coverage Verification and Cleanup

### Steps
1. Run `npm test -- --coverage`
2. Verify all new code meets 80% coverage minimum:
   - `src/mcp-server/**` ≥ 80%
   - `src/scripts/**` ≥ 80%
   - Middleware changes covered
3. If coverage is below threshold: add missing tests for uncovered branches
4. Run full test suite: `npm test` — all tests pass
5. Run `npm run build:mcp` — builds cleanly
6. Run Biome lint/format: `npm run lint` + `npm run format` — no issues
7. Verify no TODO/FIXME left in new code (except intentional future work noted in design)
8. Commit: `test: achieve 80% coverage for MCP server and scripts`

### Verify
- `npm test -- --coverage` shows ≥80% for all new modules
- `npm run lint` clean
- `npm run build:mcp` clean
- All 11 MCP tools listed in integration test

---

## CHECKPOINT: All Implementation Complete

**Stop here and wait for user review.** Full implementation is done:
- MCP server with 11 tools (7 project + 3 review + 1 history)
- Seed script with deterministic report parser and release model inference
- Validation script with Confluence comparison
- 80%+ test coverage
- KiroCrew MCP config registered
- Documentation updated

User should verify end-to-end:
1. Start Astro server
2. Run `npm run seed` with a real status report
3. Use MCP tools via KiroCrew to query/manage projects
4. Run `npm run validate:sources` (if Atlassian CLI available)

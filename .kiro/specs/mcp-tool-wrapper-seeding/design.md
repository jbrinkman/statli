# Design: MCP Tool Wrapper + Data Seeding

## Architecture

```
┌─────────────────┐     stdio      ┌─────────────────┐   HTTP + Bearer   ┌──────────────┐
│  KiroCrew Agent │◄──────────────►│   MCP Server    │──────────────────►│  Astro API   │
│                 │                 │  (Node process) │                   │  /api/*      │
└─────────────────┘                └─────────────────┘                   └──────┬───────┘
                                                                                │
                                                                                ▼
                                                                         ┌──────────────┐
                                                                         │   SQLite DB  │
                                                                         └──────────────┘

┌─────────────────┐                                                      ┌──────────────┐
│  Seed Script    │─────────────── DAL (direct import) ─────────────────►│   SQLite DB  │
│  scripts/seed   │                                                      └──────────────┘
└─────────────────┘

┌─────────────────┐     shell      ┌─────────────────┐   HTTP + Bearer   ┌──────────────┐
│ Validate Script │───────────────►│  Atlassian CLI  │                   │  Astro API   │
│ scripts/validate│                └─────────────────┘                   └──────┬───────┘
│                 │────────────────────────────────────────────────────────────►│
└─────────────────┘                                                             ▼
                                                                         ┌──────────────┐
                                                                         │   SQLite DB  │
                                                                         └──────────────┘
```

## Project Structure

```
src/
├── middleware.ts              # Extended: Bearer token check before Better Auth
├── mcp-server/
│   ├── index.ts              # Server setup, transport, tool registration
│   ├── client.ts             # Thin fetch wrapper with Bearer auth
│   └── tools/
│       ├── projects.ts       # list, get, create, update, delete, lock, unlock
│       ├── reviews.ts        # list, add, resolve review items
│       └── history.ts        # get change history
├── scripts/
│   ├── seed.ts               # Bootstrap DB from status report markdown
│   ├── validate.ts           # Compare DB against Confluence, flag discrepancies
│   └── lib/
│       ├── report-parser.ts  # Deterministic markdown table parser
│       └── release-model.ts  # Heuristic release model inference
tests/
├── unit/
│   ├── tools/
│   │   ├── projects.test.ts
│   │   ├── reviews.test.ts
│   │   └── history.test.ts
│   ├── report-parser.test.ts
│   └── release-model.test.ts
├── integration/
│   ├── mcp-server.test.ts
│   └── seed.test.ts
└── fixtures/
    └── sample-report.md      # Real-format status report fixture
```

## Key Design Decisions

### 1. MCP Server: Standalone stdio Process

Uses `@modelcontextprotocol/sdk` with `Server` and `StdioServerTransport`. Registered in KiroCrew's MCP config so it's available to all agent sessions. The server is a long-running process — KiroCrew manages its lifecycle.

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "statli", version: "1.0.0" }, { capabilities: { tools: {} } });
// Register tools...
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 2. API Client: Thin Fetch Wrapper

`client.ts` exports a class that wraps `fetch` with:
- Base URL from `STATLI_API_URL` env var (default `http://127.0.0.1:4321`)
- `Authorization: Bearer ${STATLI_API_KEY}` header on every request
- JSON parsing with typed responses
- Error normalization (HTTP errors → structured error objects)

```typescript
export class StatliClient {
  constructor(private baseUrl: string, private apiKey: string) {}
  async get<T>(path: string, params?: Record<string, string>): Promise<T> { ... }
  async post<T>(path: string, body: unknown): Promise<T> { ... }
  async patch<T>(path: string, body: unknown): Promise<T> { ... }
  async delete(path: string): Promise<void> { ... }
}
```

### 3. Auth Middleware Extension

The existing Better Auth middleware is extended with a priority check:
1. Check `Authorization: Bearer <token>` header against `STATLI_API_KEY`
2. If no Bearer token or mismatch, fall through to Better Auth session check
3. Either mechanism grants full `/api/*` access (no tiered permissions)

```typescript
// In middleware.ts
const authHeader = request.headers.get("Authorization");
if (authHeader?.startsWith("Bearer ")) {
  const token = authHeader.slice(7);
  if (token === import.meta.env.STATLI_API_KEY) {
    return next(); // API key valid, skip session check
  }
}
// Fall through to Better Auth session validation...
```

### 4. Tool Pattern

Each tool follows the same structure:
- `inputSchema`: JSON Schema defining parameters (used by MCP protocol)
- Handler function: validates input, calls API client, returns structured `text` content
- Errors return `{ isError: true, content: [{ type: "text", text: JSON.stringify({ error, code }) }] }`

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case "list_projects": return handleListProjects(client, args);
    // ...
  }
});
```

### 5. Project Lookup by Name

Tools that accept a project identifier use a UUID regex to determine the lookup strategy:
- Matches UUID pattern → query by ID: `GET /api/projects/:id`
- Does not match → query by name: `GET /api/projects?name=<encoded>`

This requires adding a `name` query parameter filter to `GET /api/projects` in the existing API (a minor addition to Spec 2's endpoint).

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}
```

### 6. Report Parser: Deterministic Regex

No LLM involvement. The parser:
1. Splits markdown by `## ` headings to identify sections
2. Identifies tables by `|` delimiter lines
3. Parses table rows using column position mapping (header row defines columns)
4. Extracts links using `LINK_REGEX`: `/\[([^\]]+)\]\(([^)]+)\)/g`
5. Infers category from section heading + project name patterns
6. Maps table/section to status: Completed table → `completed`, Merged → `merged`, etc.

```typescript
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

interface ParsedProject {
  name: string;
  category: string;
  status: string;
  pr_urls: string[];
  issue_urls: string[];
  release_url: string | null;
  drop_reason: string | null;
}
```

### 7. Release Model Inference

A pure function returning `{ model: ReleaseModel, confident: boolean }`:

| Condition | Model | Confident |
|-----------|-------|-----------|
| Release URL contains `/releases/tag/` | `github_release` | true |
| Category is `valkey_docs_demos` | `merge_is_complete` | true |
| Merged PR in `valkey-io/` org (no release URL) | `merge_is_complete` | false |
| PyPI link present | `pypi` | true |
| None of the above | `manual` | false |

Low-confidence assignments create a review item (`release_model_uncertain` type).

### 8. Seed Script: Direct DAL Import

The seed script imports the DAL directly (same codebase, same runtime) rather than going through HTTP. This is acceptable because:
- It's a one-time bootstrap operation, not a runtime tool
- Avoids needing the Astro server running during seed
- Still respects all validation (Zod schemas) and business logic (soft-delete, review items)

Idempotency: before inserting, checks `getProjectByName(normalizedName)`. If exists, skips (logs "already exists"). Normalization: lowercase, trim, collapse whitespace.

```typescript
import { db } from "../src/db/index.js";
import { createProject, getProjectByName } from "../src/db/dal.js";

for (const parsed of parsedProjects) {
  const existing = await getProjectByName(db, normalize(parsed.name));
  if (existing) { console.log(`Skip: ${parsed.name}`); continue; }
  await createProject(db, { ...parsed });
  if (!parsed.releaseModelConfident) {
    await createReviewItem(db, { project_id: newProject.id, type: "release_model_uncertain", reason: `...` });
  }
}
```

### 9. Validation Script: Atlassian CLI + API

1. Runs `atlas confluence page get --space <KEY> --title <TITLE> --output-format html` to fetch the PR Status Tracker
2. Parses HTML table rows (simple regex/cheerio — the table is straightforward)
3. For each Confluence entry, queries Statli API (`GET /api/projects?name=<name>`)
4. Flags discrepancies:
   - Project in Confluence but not in DB → `ambiguous_signal` review item: "Project X found in Confluence but missing from DB"
   - Status mismatch → `status_mismatch` review item: "Project X is 'merged' in Confluence but 'submitted' in DB"
5. Idempotent: checks existing review items before creating duplicates (match on project_id + type + reason substring)

### 10. KiroCrew MCP Config Registration

Added to `~/.kiro/crew/mcp.json`:

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

## Error Handling

- **MCP tool errors**: Return `{ isError: true, content: [{ type: "text", text: JSON.stringify({ error: "message", code: "NOT_FOUND" }) }] }`. Never throw — MCP protocol requires structured responses.
- **Seed script**: Logs per-project errors but continues processing remaining projects. Exits with code 1 if any project failed. Summary at end: "Seeded X projects, Y skipped, Z failed."
- **Validate script**: Catches CLI unavailability (`ENOENT` or non-zero exit) gracefully — logs warning "Atlassian CLI not available, skipping validation" and exits 0.

## Testing Strategy

- **Fixtures**: `tests/fixtures/sample-report.md` mirrors real report format with all table types (Completed, Merged, Submitted, Dropped, Infrastructure, Valkey Samples)
- **Report parser tests**: Parametrized across each table type + edge cases (empty tables, malformed links, missing columns)
- **Release model tests**: Parametrized across all heuristic branches with expected `{ model, confident }` output
- **Tool handler tests**: Mock `StatliClient` responses, verify correct API calls and response formatting
- **MCP integration test**: Spawn server subprocess, connect via stdio, call `tools/list`, verify all tools registered with correct schemas
- **Seed integration test**: Use test SQLite database, run seed against fixture, verify project count and review item creation

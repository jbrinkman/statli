# Design: Data Model, API & Auth

## Architecture

```
Request Flow:
┌─────────────┐    ┌──────────────────┐    ┌────────────────┐    ┌─────┐    ┌────────┐
│ HTTP Request│───▶│ Astro Middleware  │───▶│ API Route      │───▶│ DAL │───▶│ SQLite │
└─────────────┘    │ (Auth: API Key   │    │ (Zod Validate) │    └─────┘    └────────┘
                   │  OR Better Auth)  │    └────────────────┘
                   └──────────────────┘
```

## Project Structure Additions

```
src/
├── lib/
│   ├── db/
│   │   ├── index.ts          # Database connection, migration runner
│   │   ├── migrations/       # Numbered migration files
│   │   │   ├── 001_create_projects.ts
│   │   │   ├── 002_create_change_history.ts
│   │   │   └── 003_create_review_items.ts
│   │   ├── projects.ts       # Project CRUD operations
│   │   ├── history.ts        # Change history operations
│   │   └── reviews.ts        # Review item operations
│   ├── schemas/
│   │   ├── project.ts        # Project Zod schemas + types
│   │   ├── review.ts         # Review item Zod schemas + types
│   │   └── common.ts         # Shared enums, response format schemas
│   ├── auth.ts               # Better Auth configuration
│   └── errors.ts             # Custom error classes
├── middleware.ts              # Auth middleware (API key + session check)
├── pages/
│   └── api/
│       ├── auth/[...all].ts  # Better Auth catch-all handler
│       ├── projects/
│       │   ├── index.ts      # GET (list) / POST (create)
│       │   └── [id]/
│       │       ├── index.ts  # GET / PUT / DELETE
│       │       ├── lock.ts   # POST lock
│       │       ├── unlock.ts # POST unlock
│       │       ├── reviews.ts# GET / POST reviews for project
│       │       └── history.ts# GET history for project
│       ├── reviews/
│       │   ├── index.ts      # GET all reviews (filtered)
│       │   └── [id]/
│       │       └── resolve.ts# POST resolve
│       └── history/
│           └── index.ts      # GET all history (since param)
tests/
├── unit/
│   ├── db/
│   │   ├── projects.test.ts
│   │   ├── history.test.ts
│   │   └── reviews.test.ts
│   └── schemas.test.ts
├── integration/
│   ├── api/
│   │   ├── projects.test.ts
│   │   ├── reviews.test.ts
│   │   └── history.test.ts
│   └── auth.test.ts
└── helpers/
    └── test-db.ts            # In-memory SQLite factory
```

## Key Design Decisions

### 1. better-sqlite3 (Synchronous Driver, No ORM)

- Synchronous API matches Astro's request model cleanly
- No ORM — the DAL module IS the abstraction layer
- Direct SQL gives full control over queries, transactions, and performance
- Type safety achieved through Zod schemas + TypeScript inference, not ORM decorators

### 2. Custom Lightweight Migration System

- Numbered files: `001_create_projects.ts`, `002_create_change_history.ts`, etc.
- Forward-only (no down migrations — use a new migration to undo)
- Each file exports `up(db: Database)` function
- `_migrations` table tracks applied migrations: `(id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)`
- Runner: on startup, read migration files, compare against `_migrations` table, run pending in order within a transaction

```typescript
// Migration file format
import type { Database } from 'better-sqlite3';

export function up(db: Database): void {
  db.exec(`CREATE TABLE ...`);
}
```

### 3. Full SQL Schema

```sql
-- projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('integration','valkey_module','valkey_glide','valkey_docs_demos','infrastructure')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','merged','completed','dropped')),
  release_model TEXT NOT NULL CHECK (release_model IN ('github_release','merge_is_complete','pypi','npm','nuget','manual')),
  release_model_confident INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  pr_urls TEXT NOT NULL DEFAULT '[]',
  issue_urls TEXT NOT NULL DEFAULT '[]',
  release_url TEXT,
  drop_reason TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_category ON projects(category) WHERE deleted_at IS NULL;

-- change_history table
CREATE TABLE change_history (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL CHECK (changed_by IN ('system','user','agent')),
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_history_project ON change_history(project_id);
CREATE INDEX idx_history_created ON change_history(created_at);

-- review_items table
CREATE TABLE review_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('release_model','status_change','ambiguous_signal')),
  reason TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX idx_reviews_project ON review_items(project_id);
CREATE INDEX idx_reviews_unresolved ON review_items(project_id) WHERE resolved = 0;
```

### 4. DAL Pattern

- Database connection passed as parameter (dependency injection for testing)
- Change history auto-recorded within the same transaction as the mutation
- All mutations wrapped in transactions for atomicity

```typescript
// DAL function signature pattern
export function updateProject(
  db: Database,
  id: string,
  data: UpdateProjectInput,
  changedBy: ChangedBy = 'user'
): Project | null {
  const txn = db.transaction(() => {
    // 1. Validate input with Zod
    // 2. Check exists + not deleted
    // 3. Check lock (reject if locked unless force:true)
    // 4. Update fields
    // 5. Record change_history for each changed tracked field
    // 6. Return updated project
  });
  return txn();
}
```

### 5. Zod Schemas

```typescript
// src/lib/schemas/common.ts
export const categoryEnum = z.enum(['integration', 'valkey_module', 'valkey_glide', 'valkey_docs_demos', 'infrastructure']);
export const statusEnum = z.enum(['in_progress', 'submitted', 'merged', 'completed', 'dropped']);
export const releaseModelEnum = z.enum(['github_release', 'merge_is_complete', 'pypi', 'npm', 'nuget', 'manual']);
export const changedByEnum = z.enum(['system', 'user', 'agent']);
export const reviewTypeEnum = z.enum(['release_model', 'status_change', 'ambiguous_signal']);

// src/lib/schemas/project.ts
export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  category: categoryEnum,
  status: statusEnum.default('in_progress'),
  release_model: releaseModelEnum,
  release_model_confident: z.boolean().default(false),
  pr_urls: z.array(z.string().url()).default([]),
  issue_urls: z.array(z.string().url()).default([]),
  release_url: z.string().url().nullable().default(null),
  drop_reason: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  force: z.boolean().default(false),  // bypass lock for status changes
});

export const listProjectsFilterSchema = z.object({
  status: statusEnum.optional(),
  category: categoryEnum.optional(),
  needs_review: z.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsFilter = z.infer<typeof listProjectsFilterSchema>;
```

### 6. Better Auth Configuration

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';

const authSecret = process.env.AUTH_SECRET;
if (!authSecret || authSecret.length < 32) {
  throw new Error('AUTH_SECRET must be set and at least 32 characters');
}

export const auth = betterAuth({
  database: new Database(process.env.DATABASE_URL || './data/statli.db'),
  secret: authSecret,
  emailAndPassword: { enabled: true },
});
```

### 7. Astro Middleware (Dual Auth)

Auth middleware checks two schemes in order:
1. **Bearer API key** (`Authorization: Bearer <STATLI_API_KEY>`) — for machine clients (MCP server, cron)
2. **Better Auth session** — for browser/dashboard users

```typescript
// src/middleware.ts
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Skip auth for non-API routes and auth routes themselves
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth/')) {
    return next();
  }

  const authHeader = context.request.headers.get('Authorization');

  // Check API key first
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === process.env.STATLI_API_KEY) {
      context.locals.user = { id: 'api-key', type: 'machine' };
      return next();
    }
  }

  // Fall back to Better Auth session
  const session = await auth.api.getSession({ headers: context.request.headers });
  if (session?.user) {
    context.locals.user = { id: session.user.id, type: 'human' };
    return next();
  }

  return new Response(JSON.stringify({
    error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
  }), { status: 401, headers: { 'Content-Type': 'application/json' } });
});
```

### 8. Consistent JSON Response Format

```typescript
// Success responses
{ data: Project }                    // single item
{ data: Project[] }                  // list

// Error responses
{ error: { message: string, code: string, details?: ZodIssue[] } }

// HTTP status mapping
// 200 — successful read/update
// 201 — successful create
// 400 — validation failure (Zod errors in details)
// 401 — not authenticated
// 404 — resource not found (or soft-deleted)
// 409 — conflict (e.g., update locked project without force)
```

### 9. Error Classes

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(public message: string, public code: string, public status: number) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class ValidationError extends AppError {
  constructor(public details: unknown) {
    super('Validation failed', 'VALIDATION_ERROR', 400);
  }
}
```

### 10. Docker Considerations

- `data/` directory must be a volume mount for database persistence
- Migrations run on container start (before server accepts requests)
- `AUTH_SECRET` and `STATLI_API_KEY` provided via environment variables
- `DATABASE_URL` defaults to `./data/statli.db` inside container

## Testing Strategy

- **`createTestDb()` helper**: returns a fresh in-memory SQLite database with all migrations applied
- **Unit tests**: import DAL functions directly, pass test db, assert on returned types
- **Integration tests**: use Astro's test utilities to make HTTP requests against running server with test db
- **Auth tests**: verify login flow, session cookie handling, 401 on missing/invalid auth
- **Isolation**: each test file (or test case) gets its own database instance — no shared state

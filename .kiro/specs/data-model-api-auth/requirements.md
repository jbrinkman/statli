# Requirements: Data Model, API & Auth

## Functional Requirements

### 1. SQLite Database Setup

- Use migration-based schema management (not auto-sync/ORM migrations)
- Auto-run pending migrations on application start
- Configurable database path via `DATABASE_URL` environment variable (default: `./data/statli.db`)
- Create `data/` directory if it does not exist
- Add `data/*.db` and `data/*.db-journal` to `.gitignore`
- Enable WAL mode and foreign keys on connection

### 2. Project Data Model

- **id**: UUID primary key (generated at creation)
- **name**: string, unique, required
- **category**: enum — `integration`, `valkey_module`, `valkey_glide`, `valkey_docs_demos`, `infrastructure`
- **status**: enum — `in_progress`, `submitted`, `merged`, `completed`, `dropped`
- **release_model**: enum — `github_release`, `merge_is_complete`, `pypi`, `npm`, `nuget`, `manual`
- **release_model_confident**: boolean, default `false`
- **locked**: boolean, default `false`
- **pr_urls**: JSON array of URL strings
- **issue_urls**: JSON array of URL strings
- **release_url**: nullable string (URL)
- **drop_reason**: nullable string
- **notes**: nullable string
- **created_at**: ISO timestamp, auto-set on creation
- **updated_at**: ISO timestamp, auto-set on creation and every update
- **deleted_at**: nullable ISO timestamp (soft-delete marker)

### 3. Change History

- Table recording every tracked field change
- Fields: **id** (UUID), **project_id** (FK), **field_changed**, **old_value**, **new_value**, **changed_by** (enum: `system`, `user`, `agent`), **reason** (optional string), **created_at**
- Track changes to: `status`, `category`, `release_model`, `locked`
- Must be queryable by date range (for weekly report generation)
- Foreign key to projects table (cascade on delete)

### 4. Review Items

- **review_items** table replacing a single boolean flag
- Fields: **id** (UUID), **project_id** (FK), **type** (enum: `release_model`, `status_change`, `ambiguous_signal`), **reason** (string), **resolved** (boolean, default `false`), **created_at**, **resolved_at** (nullable)
- Multiple unresolved items can coexist on the same project
- `needs_review` is a computed property: `true` if any unresolved review items exist for the project
- Resolved items are kept for audit trail (never deleted)
- Foreign key to projects table (cascade on delete)

### 5. Data Access Layer

- TypeScript module at `src/lib/db/` is the ONLY code that executes SQL
- No raw SQL outside this module — all access goes through typed functions
- Functions:
  - `createProject(data)` — insert, return typed project
  - `getProject(id)` — by ID, return typed project or null
  - `listProjects(filters?)` — filter by status, category, needs_review (computed); exclude soft-deleted
  - `updateProject(id, data)` — respect lock (reject status change on locked project unless `force: true`), auto-record change history
  - `deleteProject(id)` — soft-delete (set `deleted_at`), never hard delete
  - `lockProject(id)` / `unlockProject(id)` — set locked flag, record in change history
  - `addReviewItem(projectId, type, reason)` — create review item
  - `resolveReviewItem(id)` — set resolved=true, resolved_at=now
  - `getReviewItems(projectId?, filters?)` — filter by resolved, type
  - `getChangeHistory(projectId?, since?)` — filter by project and/or date range
- Validate all inputs using Zod schemas before executing SQL
- Zod schemas are single source of truth for validation AND TypeScript types (via `z.infer`)
- Return typed response objects, not raw database rows

### 6. Authentication

- Better Auth with email/password provider
- Protect ALL `/api/*` endpoints except auth routes themselves — return 401 if unauthenticated
- Auth endpoints served via Better Auth's built-in route handler
- Store auth data (users, sessions) in the same SQLite database
- `AUTH_SECRET` environment variable required (minimum 32 characters)
- Refuse to start if `AUTH_SECRET` is missing or too short
- Document `AUTH_SECRET` in `.env.example` with generation instructions

### 7. API Routes

Astro API routes at `src/pages/api/`:

- `GET /api/projects` — list with query filters (status, category, needs_review)
- `POST /api/projects` — create project
- `GET /api/projects/[id]` — get single project
- `PUT /api/projects/[id]` — update project
- `DELETE /api/projects/[id]` — soft-delete project
- `POST /api/projects/[id]/lock` — lock project
- `POST /api/projects/[id]/unlock` — unlock project
- `GET /api/projects/[id]/reviews` — list review items for project
- `POST /api/projects/[id]/reviews` — add review item
- `POST /api/reviews/[id]/resolve` — resolve a review item
- `GET /api/projects/[id]/history` — change history for project
- `GET /api/history` — all change history (with `since` query param)
- `GET /api/reviews` — all review items (with `resolved`, `type` filters)

All routes:
- Require authentication (return 401 if not authenticated)
- Validate request body/params with Zod (return 400 with structured error details)
- Use consistent JSON response format:
  - Success: `{ data: <result> }`
  - Error: `{ error: { message: string, code: string, details?: object } }`
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict (lock violations)

### 8. Testing

- Unit tests for DAL: all CRUD operations, lock enforcement, validation rejection, change history recording, soft-delete behavior
- Integration tests for API: authenticated requests, 401 on missing auth, 400 on invalid input, filtering, lock conflict (409)
- Auth flow tests: login, session validation, protected route rejection
- 80% code coverage minimum
- In-memory SQLite for test isolation (each test gets fresh database)
- All tests must pass before task is marked complete

## Non-Functional Requirements

- API responses under 100ms for datasets up to 200 projects
- Parameterized queries only (no string interpolation in SQL)
- `AUTH_SECRET` minimum 32 characters enforced at startup
- Foreign keys enabled (`PRAGMA foreign_keys = ON`)
- Migrations must work identically in container and local environments
- WAL mode for concurrent read performance

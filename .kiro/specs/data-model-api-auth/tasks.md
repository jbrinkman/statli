# Tasks: Data Model, API & Auth

> **HARD GATE**: Every task MUST update relevant documentation (README.md for humans, .kiro/steering/ for agents) before being marked complete. No exceptions.

## Task 1: Install Database Dependencies

Install production and dev dependencies:

```bash
npm install better-sqlite3 zod uuid
npm install -D @types/better-sqlite3 @types/uuid
```

Create `data/.gitkeep` to ensure directory exists in repo.

Add to `.env.example`:
```
DATABASE_URL=./data/statli.db
AUTH_SECRET=generate-with-openssl-rand-base64-32-minimum-32-chars
STATLI_API_KEY=generate-with-openssl-rand-hex-32
```

Add to `.gitignore`:
```
data/*.db
data/*.db-journal
data/*.db-wal
```

Update `.kiro/steering/project-structure.md` to document the `src/lib/db/` module and `data/` directory purpose.

**Commit**: `feat(db): add database dependencies and data directory`

## Task 2: Create Zod Schemas

Create `src/lib/schemas/common.ts`:
- Export `categoryEnum`, `statusEnum`, `releaseModelEnum`, `changedByEnum`, `reviewTypeEnum` as Zod enums
- Export `successResponse(dataSchema)` and `errorResponse` schema factories
- Export `ChangedBy`, `Category`, `Status`, `ReleaseModel`, `ReviewType` types via `z.infer`

Create `src/lib/schemas/project.ts`:
- Export `createProjectSchema` with all required/optional fields per design
- Export `updateProjectSchema` as partial of create + `force` boolean
- Export `listProjectsFilterSchema` with optional status, category, needs_review
- Export types: `CreateProjectInput`, `UpdateProjectInput`, `ListProjectsFilter`, `Project`

Create `src/lib/schemas/review.ts`:
- Export `createReviewItemSchema` (type, reason)
- Export `listReviewItemsFilterSchema` (resolved, type)
- Export types: `CreateReviewItemInput`, `ReviewItem`

**Commit**: `feat(schemas): add Zod schemas for projects, reviews, and common types`

## Task 3: Create Migration System

Create `src/lib/db/index.ts`:
- Export `createDatabase(path?: string)` — opens connection, enables WAL + foreign keys, runs migrations
- Default path from `DATABASE_URL` env var or `./data/statli.db`
- Create `data/` directory if not exists (using `fs.mkdirSync` with recursive)
- Export `runMigrations(db)` — reads migration files, checks `_migrations` table, runs pending in order in a transaction
- Create `_migrations` table if not exists: `(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at TEXT NOT NULL)`

Create `src/lib/db/migrations/001_create_projects.ts`:
- Export `up(db)` function with full projects CREATE TABLE including all CHECK constraints and indexes per design

Create `src/lib/db/migrations/002_create_change_history.ts`:
- Export `up(db)` function with change_history CREATE TABLE, foreign key, and indexes per design

Create `src/lib/db/migrations/003_create_review_items.ts`:
- Export `up(db)` function with review_items CREATE TABLE, foreign key, and indexes per design

Write unit test `tests/unit/db/migrations.test.ts`:
- Test that `createDatabase(':memory:')` succeeds
- Test that all tables exist after migrations
- Test that running migrations twice is idempotent
- Test that `_migrations` table records applied migrations

Run `npm test` — all tests must pass.

**Commit**: `feat(db): add migration system and initial schema migrations`

## Task 4: Implement Project DAL

Create `src/lib/db/projects.ts`:
- `createProject(db, data: CreateProjectInput): Project` — validate with Zod, generate UUID, set timestamps, insert, return typed
- `getProject(db, id: string): Project | null` — exclude soft-deleted, parse pr_urls/issue_urls from JSON
- `listProjects(db, filters?: ListProjectsFilter): Project[]` — filter by status/category, compute needs_review via LEFT JOIN on unresolved review_items, exclude soft-deleted
- `updateProject(db, id: string, data: UpdateProjectInput, changedBy: ChangedBy): Project | null` — validate, check exists, check lock (reject status change if locked unless force:true with ConflictError), update fields, record change_history for each tracked field that changed, return updated
- `deleteProject(db, id: string): boolean` — set deleted_at, record change history
- `lockProject(db, id: string, changedBy: ChangedBy): Project | null` — set locked=true, record change history
- `unlockProject(db, id: string, changedBy: ChangedBy): Project | null` — set locked=false, record change history

Write unit tests `tests/unit/db/projects.test.ts`:
- Test create with valid data returns typed project with generated id and timestamps
- Test create with invalid data throws validation error
- Test create with duplicate name throws error
- Test get returns project, get with bad id returns null, get soft-deleted returns null
- Test list with no filters returns all non-deleted
- Test list with status filter, category filter
- Test update changes fields and records change history
- Test update locked project without force throws ConflictError
- Test update locked project with force:true succeeds
- Test delete sets deleted_at
- Test lock/unlock toggle and history recording

Run `npm test` — all tests must pass.

**Commit**: `feat(db): implement project data access layer with full CRUD`

## Task 5: Implement History DAL

Create `src/lib/db/history.ts`:
- `recordChange(db, projectId, field, oldValue, newValue, changedBy, reason?)` — insert into change_history
- `getChangeHistory(db, projectId?: string, since?: string): ChangeHistoryEntry[]` — filter by project and/or since date, order by created_at DESC

Write unit tests `tests/unit/db/history.test.ts`:
- Test recordChange inserts correctly
- Test getChangeHistory returns entries for specific project
- Test getChangeHistory with since filter excludes older entries
- Test getChangeHistory without projectId returns all entries

Run `npm test` — all tests must pass.

**Commit**: `feat(db): implement change history data access layer`

## Task 6: Implement Review Items DAL

Create `src/lib/db/reviews.ts`:
- `addReviewItem(db, projectId, type, reason): ReviewItem` — validate type enum, generate UUID, insert
- `resolveReviewItem(db, id: string): ReviewItem | null` — set resolved=true, resolved_at=now, return updated
- `getReviewItems(db, projectId?: string, filters?: { resolved?: boolean, type?: string }): ReviewItem[]` — filter by project, resolved status, type

Write unit tests `tests/unit/db/reviews.test.ts`:
- Test addReviewItem creates item with correct defaults
- Test addReviewItem with invalid type throws
- Test resolveReviewItem sets resolved and resolved_at
- Test resolveReviewItem with bad id returns null
- Test getReviewItems filters by project, resolved, type
- Test multiple unresolved items can coexist on same project

Run `npm test` — all tests must pass.

**Commit**: `feat(db): implement review items data access layer`

## Task 7: Create Error Classes

Create `src/lib/errors.ts`:
- `AppError` extends Error with message, code, status properties
- `NotFoundError` extends AppError (404, 'NOT_FOUND')
- `ConflictError` extends AppError (409, 'CONFLICT')
- `ValidationError` extends AppError (400, 'VALIDATION_ERROR') with details property

Create `src/lib/api-utils.ts`:
- `successResponse(data, status = 200)` — returns Response with `{ data }` JSON body
- `createdResponse(data)` — returns Response with `{ data }` JSON body, status 201
- `errorResponse(error: AppError)` — returns Response with `{ error: { message, code, details? } }` JSON body
- `handleApiError(error: unknown)` — catch-all: if AppError return errorResponse, if ZodError return 400 with issues, else return 500

Write unit test `tests/unit/errors.test.ts`:
- Test each error class has correct status, code, message
- Test handleApiError maps AppError, ZodError, and unknown errors correctly

Run `npm test` — all tests must pass.

**Commit**: `feat(api): add error classes and API response utilities`

---

## CHECKPOINT 1

**Stop here and wait for user review.** Verify:
- All DAL functions work correctly with in-memory SQLite
- All tests pass (`npm test`)
- Schema migrations create correct tables
- Change history is auto-recorded on mutations
- Lock enforcement works (reject without force, allow with force)
- Review items support multiple concurrent unresolved items

---

## Task 8: Set Up Better Auth

Install Better Auth:
```bash
npm install better-auth
```

Create `src/lib/auth.ts`:
- Validate `AUTH_SECRET` exists and is >= 32 chars (throw on startup if not)
- Configure Better Auth with SQLite adapter (same database), email+password enabled
- Export `auth` instance

Create `src/pages/api/auth/[...all].ts`:
- Astro API route that delegates to Better Auth's handler for all auth sub-routes

Add to `.env.example` if not already present:
```
AUTH_SECRET=generate-with-openssl-rand-base64-32-minimum-32-chars
```

Write test `tests/integration/auth.test.ts`:
- Test signup creates user
- Test login returns session
- Test invalid credentials rejected

Run `npm test` — all tests must pass.

**Commit**: `feat(auth): configure Better Auth with email/password and SQLite`

## Task 9: Create Auth Middleware

Create `src/middleware.ts`:
- Import auth from `src/lib/auth.ts`
- Skip non-API routes and `/api/auth/*` routes
- Check `Authorization: Bearer <token>` header first — if matches `STATLI_API_KEY` env var, set `context.locals.user = { id: 'api-key', type: 'machine' }`
- Otherwise check Better Auth session — if valid, set `context.locals.user = { id: session.user.id, type: 'human' }`
- If neither, return 401 JSON response

Add type declaration for `context.locals.user` in `src/env.d.ts`.

Write test `tests/integration/middleware.test.ts`:
- Test API key auth succeeds
- Test session auth succeeds
- Test missing auth returns 401
- Test invalid API key returns 401
- Test non-API routes pass through without auth

Run `npm test` — all tests must pass.

**Commit**: `feat(auth): add dual auth middleware (API key + session)`

## Task 10: Implement Project API Routes

Create `src/pages/api/projects/index.ts`:
- `GET` — parse query params with `listProjectsFilterSchema`, call `listProjects(db, filters)`, return successResponse
- `POST` — parse body with `createProjectSchema`, call `createProject(db, data)`, return createdResponse

Create `src/pages/api/projects/[id]/index.ts`:
- `GET` — call `getProject(db, id)`, return 404 if null, else successResponse
- `PUT` — parse body with `updateProjectSchema`, call `updateProject(db, id, data, changedBy)`, return 404 if null, else successResponse
- `DELETE` — call `deleteProject(db, id)`, return 404 if false, else successResponse with `{ deleted: true }`

Create `src/pages/api/projects/[id]/lock.ts`:
- `POST` — call `lockProject(db, id, changedBy)`, return 404 if null, else successResponse

Create `src/pages/api/projects/[id]/unlock.ts`:
- `POST` — call `unlockProject(db, id, changedBy)`, return 404 if null, else successResponse

All routes: wrap in try/catch with `handleApiError`.

Write integration tests `tests/integration/api/projects.test.ts`:
- Test CRUD flow: create, get, list, update, delete
- Test validation errors return 400 with details
- Test 404 on missing project
- Test 409 on locked project update
- Test query filters work

Run `npm test` — all tests must pass.

**Commit**: `feat(api): implement project CRUD API routes`

## Task 11: Implement Review API Routes

Create `src/pages/api/projects/[id]/reviews.ts`:
- `GET` — call `getReviewItems(db, id)`, return successResponse
- `POST` — parse body with `createReviewItemSchema`, call `addReviewItem(db, id, type, reason)`, return createdResponse

Create `src/pages/api/reviews/index.ts`:
- `GET` — parse query params (resolved, type), call `getReviewItems(db, null, filters)`, return successResponse

Create `src/pages/api/reviews/[id]/resolve.ts`:
- `POST` — call `resolveReviewItem(db, id)`, return 404 if null, else successResponse

Write integration tests `tests/integration/api/reviews.test.ts`:
- Test create review item
- Test list review items for project
- Test list all reviews with filters
- Test resolve review item
- Test 404 on resolve missing item

Run `npm test` — all tests must pass.

**Commit**: `feat(api): implement review items API routes`

## Task 12: Implement History API Routes

Create `src/pages/api/projects/[id]/history.ts`:
- `GET` — call `getChangeHistory(db, id)`, return successResponse

Create `src/pages/api/history/index.ts`:
- `GET` — parse `since` query param (ISO date string), call `getChangeHistory(db, null, since)`, return successResponse

Write integration tests `tests/integration/api/history.test.ts`:
- Test history returned for project after status change
- Test history with since filter
- Test global history endpoint returns all entries

Run `npm test` — all tests must pass.

**Commit**: `feat(api): implement change history API routes`

## Task 13: End-to-End Integration Tests

Write `tests/integration/e2e-flow.test.ts` covering the full lifecycle:
1. Create a project
2. Update its status (verify change history recorded)
3. Lock it (verify status update rejected without force)
4. Add review item (verify needs_review computed true on list)
5. Resolve review item (verify needs_review computed false)
6. Unlock and soft-delete
7. Verify deleted project excluded from list
8. Verify full change history for project

Run full test suite: `npm test` — all tests must pass.

Run coverage: `npm run test:coverage` — verify 80%+ coverage.

**Commit**: `test: add end-to-end integration tests for full project lifecycle`

## Task 14: Startup Validation

Update `src/lib/db/index.ts` or create `src/lib/startup.ts`:
- On import/app start: validate `AUTH_SECRET` is present and >= 32 chars
- On import/app start: validate `DATABASE_URL` is accessible (or create default path)
- Log warning if `STATLI_API_KEY` is not set (API key auth disabled)
- Ensure database connection established and migrations run before server accepts requests

Write test `tests/unit/startup.test.ts`:
- Test missing AUTH_SECRET throws
- Test short AUTH_SECRET throws
- Test valid AUTH_SECRET passes
- Test database creation with default path

Run `npm test` — all tests must pass.

**Commit**: `feat: add startup validation for required environment variables`

## Task 15: Update Documentation

Update `README.md`:
- Add "Database" section: explain SQLite setup, migration system, `data/` directory
- Add "Authentication" section: explain Better Auth setup, API key for machine clients
- Add "API" section: list all endpoints with brief descriptions
- Add "Environment Variables" section: document all env vars with examples
- Update "Development" section: how to create migrations, run tests, seed data

Update `.kiro/steering/project-structure.md`:
- Document full `src/lib/db/` module structure and purpose
- Document `src/lib/schemas/` module structure
- Document middleware auth flow
- Document API route conventions (Zod validation, error format, response shape)

Update `.kiro/steering/conventions.md` (or create if needed):
- Document: all SQL in DAL only, Zod schemas are source of truth, soft-delete only, parameterized queries only
- Document: API response format standard, error code conventions

**Commit**: `docs: update README and steering files for data model and API layer`

## Task 16: Final Verification

Run full check:
```bash
npm run check        # TypeScript + Astro checks
npm run lint         # Biome lint
npm run format       # Biome format check
npm test             # All tests pass
npm run test:coverage # 80%+ coverage
```

Fix any issues found. Verify:
- All endpoints return correct status codes
- Auth rejects unauthenticated requests
- Lock enforcement works end-to-end
- Change history records all tracked mutations
- Review items support concurrent unresolved items
- Soft-deleted projects excluded from all queries
- No TypeScript errors, no lint warnings

**Commit**: `chore: final verification pass for data model and API spec`

---

## CHECKPOINT 2

**Stop here and wait for user review.** The full data layer and API are complete. Verify:
- All API endpoints functional with proper auth
- Dual auth (API key + session) working
- Full test coverage meeting 80% threshold
- Documentation complete (README + steering)
- Clean `npm run check && npm run lint && npm test`

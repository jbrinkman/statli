---
inclusion: always
---

# Project Conventions

## Technology Stack

- **Runtime:** Node.js (current LTS, see `.node-version`)
- **Framework:** Astro SSR with `@astrojs/node` adapter
- **Language:** TypeScript (strict mode)
- **Database:** SQLite (via better-sqlite3, sync driver)
- **Linting/Formatting:** Biome (sole tool — no ESLint, no Prettier)
- **Unit/Integration Tests:** Vitest with v8 coverage
- **E2E Tests:** Playwright (Chromium)
- **Container:** Docker multi-stage build

## Dependency Policy

- Pin major versions; `^` ranges are OK for minor/patch
- Current LTS versions validated, not assumed
- Use well-known, actively maintained packages
- Exact versions for critical infrastructure (Node, Astro)

## Code Style

- Biome enforced — no exceptions
- Indentation: tabs
- Line width: 100 characters
- Rules: `noNonNullAssertion` (error), `noExplicitAny` (error)
- All files must pass `npm run lint` before commit

## Architecture

- Single Astro app — no separate backend process
- API routes live in `src/pages/api/`
- Database access through API layer only (no direct SQL from pages)
- SSR mode — all pages render at request time

## CI Conventions

- All CI steps use `npm run` scripts (mirror local workflow)
- All GitHub Actions use latest major version (no deprecated Node warnings)
- `.node-version` is the single source of truth for Node version
- CI must pass before merge — no `continue-on-error` for quality steps

## Documentation

- Hard gate: every task must update relevant docs before completion
- `README.md` — for humans: how to run, prerequisites, commands
- `.kiro/steering/` — for agents: conventions, structure, constraints
- No duplication between the two

## Project Structure

```
statli/
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── .kiro/
│   ├── specs/                  # Implementation specs (5 phases)
│   └── steering/               # Agent conventions and constraints
├── data/                       # SQLite database directory (gitignored except .gitkeep)
├── src/
│   ├── env.d.ts                # Astro type references
│   ├── layouts/Layout.astro    # Base HTML layout
│   ├── middleware.ts           # Auth middleware (API key + Better Auth session)
│   ├── lib/
│   │   ├── api-utils.ts        # JSON response helpers and error handler
│   │   ├── auth.ts             # Better Auth configuration
│   │   ├── errors.ts           # AppError, NotFoundError, ConflictError, ValidationError
│   │   ├── startup.ts          # Environment validation on boot
│   │   ├── db/                 # Database module (connection, migrations, DAL)
│   │   │   ├── index.ts        # createDatabase(), runMigrations()
│   │   │   ├── connection.ts   # Singleton DB instance for API routes
│   │   │   ├── projects.ts     # Project CRUD + lock/unlock
│   │   │   ├── history.ts      # Change history recording + queries
│   │   │   ├── reviews.ts      # Review items CRUD
│   │   │   └── migrations/     # Numbered SQL migration files
│   │   └── schemas/            # Zod validation schemas (single source of truth)
│   │       ├── common.ts       # Enums, response format, shared types
│   │       ├── project.ts      # Create/update/filter schemas + Project type
│   │       └── review.ts       # Review item schemas + ReviewItem type
│   └── pages/
│       ├── api/                # API routes (all DB access goes through here)
│       │   ├── auth/[...all].ts
│       │   ├── projects/       # CRUD, lock/unlock, reviews, history
│       │   ├── reviews/        # Global review list + resolve
│       │   └── history/        # Global change history
│       └── index.astro         # Homepage
├── tests/
│   ├── e2e/                    # Playwright end-to-end tests
│   ├── integration/            # DAL + API integration tests
│   └── unit/                   # Vitest unit tests
├── .env.example                # Environment variable template
├── .node-version               # Node.js version (24)
├── astro.config.ts             # Astro SSR + Node adapter config
├── biome.json                  # Linter/formatter configuration
├── docker-compose.yml          # Docker Compose for local dev
├── Dockerfile                  # Multi-stage production build
├── package.json                # Dependencies and scripts
├── playwright.config.ts        # E2E test configuration
├── tsconfig.json               # TypeScript strict config
└── vitest.config.ts            # Unit test + coverage config
```

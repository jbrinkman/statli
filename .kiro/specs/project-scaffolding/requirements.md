# Requirements: Project Scaffolding + Infrastructure

## Goal

Establish the foundational project scaffolding for Statli v2 -- a project status tracking dashboard with AI-powered data ingestion. This spec sets up the complete development infrastructure so that all subsequent specs can build on a solid, tested, containerized, CI-validated base.

Statli v2 replaces the previous Go/Wails implementation with a TypeScript/Astro stack. The repo history is preserved; this spec starts with a clean "reset" commit.

## Requirements

### 1. Repository Reset

**User Story:** As a developer, I want the repository reset to a clean state, so that the new TypeScript/Astro project starts fresh without legacy Go code in the working tree.

**Acceptance Criteria:**
- WHEN the reset commit is applied THEN the working tree SHALL contain only: LICENSE (BSD 3-Clause, preserved), README.md (new content for v2), .gitignore (rewritten for Astro/Node/TypeScript), and the `.kiro/` directory (including specs)
- THE SYSTEM SHALL rewrite `.gitignore` for the new tech stack (Node, Astro, TypeScript, SQLite, env files) -- no Go-specific entries
- THE SYSTEM SHALL preserve the `.kiro/specs/` directory and all its contents (including this spec) through the reset
- WHEN viewing git history THEN prior Go/Wails commits SHALL remain accessible via `git log --all`
- THE SYSTEM SHALL NOT use destructive git operations (no `git filter-branch`, no force-push to main)

### 2. Project Steering Documentation

**User Story:** As a developer (human or AI), I want project constraints documented in `.kiro/steering/` files before any code is written, so that all subsequent setup and implementation follows consistent conventions from the start.

**Acceptance Criteria:**
- THE SYSTEM SHALL include `.kiro/steering/` files documenting:
  - Technology choices and versions (Node LTS, Astro, Biome, Vitest, Playwright)
  - Code quality rules (strict mode, Biome as sole linter/formatter, no ESLint/Prettier)
  - Testing requirements (80% coverage, 100% pass rate, Vitest + Playwright)
  - Task completion rules (clean commit after every task, docs updated, tests passing)
  - Containerization approach (Docker, multi-stage build)
  - Dependency policy (pin major versions, `^` ranges for minor/patch)
  - API architecture (Astro API routes, no separate backend)
  - Documentation: Every task must update relevant docs; docs are a hard gate
- WHEN an agent reads the steering files THEN it SHALL have enough context to follow all project conventions without external guidance
- THE SYSTEM SHALL create steering docs as the FIRST action after the repo reset, before installing any dependencies or configuring tools

### 3. Astro Project Setup

**User Story:** As a developer, I want an Astro project configured in SSR mode with the Node adapter, so that pages can query data at request time without requiring static rebuilds.

**Acceptance Criteria:**
- THE SYSTEM SHALL use the current LTS version of Node.js (validated, not assumed)
- THE SYSTEM SHALL use Astro with the `@astrojs/node` adapter configured for SSR (`output: 'server'`)
- WHEN `npm run dev` is executed THEN the Astro dev server SHALL start and serve a basic health-check page at `/`
- THE SYSTEM SHALL include a `package.json` with `engines` field specifying the validated Node LTS version
- THE SYSTEM SHALL pin major versions for all dependencies (using `^` semver ranges to allow minor/patch updates, but no cross-major-version drift)

### 4. Code Quality Tooling

**User Story:** As a developer, I want Biome configured for linting and formatting with strict mode, so that code quality is enforced consistently across all contributors (human and AI).

**Acceptance Criteria:**
- THE SYSTEM SHALL use Biome as the sole linter and formatter (no ESLint, no Prettier)
- WHEN Biome is run THEN it SHALL enforce strict mode rules
- THE SYSTEM SHALL include a `biome.json` configuration at the project root
- WHEN `npm run lint` is executed THEN Biome SHALL check all TypeScript/JavaScript files
- WHEN `npm run format` is executed THEN Biome SHALL format all TypeScript/JavaScript files
- THE SYSTEM SHALL pass Biome checks with zero errors on the initial scaffolded code

### 5. Testing Framework

**User Story:** As a developer, I want Vitest and Playwright configured with a passing NoOp test, so that the test infrastructure is validated and ready for business logic tests in subsequent specs.

**Acceptance Criteria:**
- THE SYSTEM SHALL use Vitest for unit and integration tests
- THE SYSTEM SHALL use Playwright for end-to-end tests
- WHEN `npm run test` is executed THEN at least one NoOp unit test SHALL pass (e.g., `expect(true).toBe(true)`)
- WHEN `npm run test:e2e` is executed THEN at least one NoOp Playwright test SHALL pass (e.g., navigate to `/` and assert page loads)
- THE SYSTEM SHALL include coverage configuration targeting 80% minimum (enforced from Spec 2 onward; Spec 1 establishes the tooling only)

### 6. Containerization

**User Story:** As a developer, I want a working Dockerfile using multi-stage builds, so that the app can be built and run in a container from day one.

**Acceptance Criteria:**
- THE SYSTEM SHALL include a multi-stage Dockerfile (build stage + runtime stage)
- WHEN `docker build .` is executed THEN the image SHALL build successfully
- WHEN the container is run THEN it SHALL serve the Astro app on port 4321
- THE SYSTEM SHALL include a `.dockerignore` file excluding node_modules, .git, and other non-essential files
- THE SYSTEM SHALL use the same Node LTS version in the Dockerfile as specified in `package.json` engines

### 7. CI Pipeline

**User Story:** As a developer, I want a GitHub Actions CI pipeline that validates every push, so that broken code is caught before merge.

**Acceptance Criteria:**
- THE SYSTEM SHALL include a GitHub Actions workflow (`.github/workflows/ci.yml`)
- WHEN a push or PR targets `main` THEN the workflow SHALL run: lint, type-check, unit tests, build, and e2e tests
- THE SYSTEM SHALL use `npm run` scripts for all CI steps (mirroring local developer workflow)
- THE SYSTEM SHALL use the latest major version of all GitHub Actions (no deprecated Node.js warnings)
- WHEN any step fails THEN the workflow SHALL fail the entire run (no `continue-on-error` for quality steps)

### 8. Documentation

**User Story:** As a developer, I want a README that explains how to get started, so that any new contributor can set up and run the project within minutes.

**Acceptance Criteria:**
- THE SYSTEM SHALL include a README.md with: project description, prerequisites, setup instructions, available npm scripts, and Docker usage
- THE README SHALL NOT duplicate information from `.kiro/steering/` files (README is for humans running the project; steering is for agents building it)
- WHEN a developer follows the README steps THEN they SHALL have a running development environment

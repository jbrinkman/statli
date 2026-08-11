# Tasks: Project Scaffolding + Infrastructure

> **Hard gate on every task:** Documentation MUST be updated before a task can be marked complete. Update the appropriate documentation:
> - **README.md** — human-facing: getting started, how to run, prerequisites
> - **`.kiro/steering/` files** — agent-facing: conventions, project structure, tool configs, constraints
>
> No duplication between the two. If a task adds something a developer would need to know about, the docs must reflect it.

## Task 1: Repository Reset

_Requirements: 1_

- [ ] Remove legacy files using explicit targeted commands: `git rm -r src docs .vscode` and `git rm README.md` (list ONLY the specific paths that exist to remove — NEVER use `git rm -r .` or `git rm -r *`)
- [ ] Verify: `git status` shows .kiro/ directory is UNTOUCHED (no changes inside .kiro/)
- [ ] Rewrite `.gitignore` for Astro/Node/TypeScript stack: node_modules/, dist/, .astro/, .env, .env.\*, !.env.example, \*.db, \*.sqlite, coverage/, test-results/, playwright-report/, .DS_Store, \*.log
- [ ] Create placeholder `README.md` with project name, single-line description ("Statli v2 — Project status tracking dashboard with AI-powered data ingestion"), and Getting Started section noting "Setup in progress — see subsequent commits"
- [ ] Verify: `git status` shows only intended changes; `git log` still shows full history; .kiro/ is untouched
- [ ] Commit: `chore: reset repository for v2 TypeScript/Astro rewrite`

## Task 2: Project Steering Documents

_Requirements: 2_

- [ ] Create `.kiro/steering/project-conventions.md` with sections: Technology Stack (Astro SSR, TypeScript strict, SQLite, Biome), Dependency Policy (pin major versions, ^ ranges OK for minor/patch, current LTS versions validated not assumed), Code Style (Biome enforced, tabs, 100-char lines, no ESLint/Prettier), Architecture (single Astro app, API routes in src/pages/api/, no separate backend), CI Conventions (all steps use npm run scripts, all GitHub Actions at latest major version, .node-version as source of truth), Documentation (hard gate — every task updates docs, README for humans, steering for agents, no duplication)
- [ ] Create `.kiro/steering/task-completion.md` with checklist: 100% test pass, 80% coverage minimum, clean commit (conventional commit format with signoff), update docs, Biome passes (no lint/format errors), Docker build succeeds, CI uses npm run scripts, all GitHub Actions at latest major version
- [ ] Verify: both files exist and are properly formatted markdown
- [ ] Commit: `docs: add project steering documents for agent conventions`

## Task 3: Initialize Node Project

_Requirements: 3_

- [ ] Create `.node-version` file containing the current Node LTS version number (validate by checking https://nodejs.org or running `node --version` if LTS is installed — do NOT assume a version)
- [ ] Run `npm init -y` to create `package.json`
- [ ] Edit `package.json`: set name to "statli", version "2.0.0", description "Project status tracking dashboard with AI-powered data ingestion", type "module", private true
- [ ] Remove default scripts from package.json (will be added by subsequent tasks)
- [ ] Run `npm install astro @astrojs/node`
- [ ] Run `npm install -D typescript @biomejs/biome vitest @vitest/coverage-v8 @playwright/test`
- [ ] Add scripts to package.json: `"dev": "astro dev"`, `"build": "astro build"`, `"preview": "astro preview"`, `"lint": "biome check ."`, `"lint:fix": "biome check --write ."`, `"test": "vitest run"`, `"test:coverage": "vitest run --coverage"`, `"test:e2e:install": "npx playwright install --with-deps chromium"`, `"test:e2e": "playwright test"`
- [ ] Verify: `npm run lint` exits without error (no source files to lint yet is OK)
- [ ] Commit: `build: initialize Node project with Astro and dev dependencies`

## Task 4: TypeScript and Tooling Configuration

_Requirements: 3, 4_

- [ ] Create `tsconfig.json` extending `astro/tsconfigs/strict`
- [ ] Create `biome.json` with: $schema pointing to current Biome version schema, organizeImports enabled, linter enabled with recommended rules plus noNonNullAssertion error and noExplicitAny error, formatter with indentStyle tab and lineWidth 100, files include ["src/\*\*/\*.ts", "src/\*\*/\*.astro", "tests/\*\*/\*.ts"]
- [ ] Create `vitest.config.ts` with: test include ["tests/unit/\*\*/\*.test.ts"], coverage provider "v8" include ["src/\*\*/\*.ts"] thresholds statements/branches/functions/lines all 80
- [ ] Create `playwright.config.ts` with: testDir "./tests/e2e", webServer command "npm run dev" port 4321 reuseExistingServer !process.env.CI
- [ ] Verify: `npx tsc --noEmit` passes (no type errors)
- [ ] Verify: `npm run lint` passes
- [ ] Commit: `build: add TypeScript, Biome, Vitest, and Playwright configuration`

## Task 5: Astro Application Shell

_Requirements: 5_

- [ ] Create `astro.config.ts` with: import defineConfig from astro/config, import node from @astrojs/node, export default defineConfig with output "server" and adapter node({ mode: "standalone" })
- [ ] Create `src/env.d.ts` with: `/// <reference types="astro/client" />`
- [ ] Create `src/layouts/Layout.astro` with: HTML5 boilerplate, `<slot />` in body, title prop, meta charset utf-8, meta viewport
- [ ] Create `src/pages/index.astro` with: imports Layout, renders heading "Statli" and paragraph "Project status tracking dashboard"
- [ ] Create `.env.example` with: `HOST=0.0.0.0` and `PORT=4321` (commented with descriptions)
- [ ] Verify: `npm run dev` starts without errors (Ctrl+C after confirming startup message)
- [ ] Verify: `npm run build` completes successfully
- [ ] Commit: `feat: add Astro application shell with layout and index page`

## Task 6: Testing Infrastructure

_Requirements: 6_

- [ ] Create `tests/unit/noop.test.ts` with: a single test that asserts `true === true` (validates Vitest runs)
- [ ] Create `tests/e2e/health.spec.ts` with: a Playwright test that navigates to `/` and asserts response status 200 and page contains "Statli"
- [ ] Verify: `npm run test` passes (noop test green)
- [ ] Verify: `npm run test:coverage` passes and shows coverage report (will be low/0% — that's expected since there's no real src code yet)
- [ ] Verify: `npm run test:e2e:install` completes (installs Chromium)
- [ ] Verify: `npm run test:e2e` passes (health check green)
- [ ] Commit: `test: add unit test infrastructure and e2e health check`

## Task 7: Docker Configuration

_Requirements: 7_

- [ ] Create `Dockerfile` with multi-stage build: Stage 1 (build) uses node:22-alpine, WORKDIR /app, COPY package\*.json, npm ci, COPY ., npm run build. Stage 2 (production) uses node:22-alpine, WORKDIR /app, COPY --from=build /app/dist ./dist, COPY --from=build /app/node_modules ./node_modules, COPY --from=build /app/package.json ./package.json, ENV HOST=0.0.0.0 PORT=4321, EXPOSE 4321, CMD ["node", "./dist/server/entry.mjs"]
- [ ] Create `docker-compose.yml` with: services.app build ".", ports "127.0.0.1:4321:4321", environment HOST=0.0.0.0 PORT=4321
- [ ] Verify: `docker build -t statli .` completes successfully
- [ ] Verify: `docker run --rm -p 127.0.0.1:4321:4321 statli` starts and responds on localhost:4321 (stop after confirming)
- [ ] Commit: `build: add Docker multi-stage build and compose configuration`

---

## 🛑 CHECKPOINT: Infrastructure Review

**STOP. Do not proceed until the user explicitly approves.**

At this point, the project has:
- Clean repo reset with preserved history
- Steering documents establishing conventions
- Full Node/TypeScript/Astro project with all tooling configured
- Passing unit and e2e tests
- Working Docker build

Review the commits so far and confirm the foundation is solid before proceeding to CI and documentation.

---

## Task 8: CI Pipeline

_Requirements: 8_

- [ ] Create `.github/workflows/ci.yml` with: name "CI", on push and pull_request, single job "build" on ubuntu-latest, steps: actions/checkout@v4, actions/setup-node@v4 (node-version-file .node-version, cache npm), run npm ci, run npm run lint, run npm run test:coverage, run npm run test:e2e:install, run npm run test:e2e
- [ ] Validate action versions are current: check https://github.com/actions/checkout/releases and https://github.com/actions/setup-node/releases for latest major — use @v4 only if confirmed current (update if v5+ exists)
- [ ] Verify: `act` or manual review confirms YAML is valid (if act not available, use `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`)
- [ ] Commit: `ci: add GitHub Actions workflow for lint, test, and e2e`

## Task 9: CONTRIBUTING Guide

_Requirements: 9_

- [ ] Create `CONTRIBUTING.md` with sections: Prerequisites (Node LTS, Docker), Getting Started (clone, npm ci, npm run dev), Development Commands (table of all npm scripts), Code Style (Biome enforced, run npm run lint:fix), Testing (unit with npm run test, e2e with npm run test:e2e), Docker (build and run commands), Commit Convention (conventional commits with signoff)
- [ ] Commit: `docs: add contributing guide`

## Task 10: README Finalization

_Requirements: 2, 9_

- [ ] Replace placeholder README.md with full content: project name and description, badges (CI workflow status), Quick Start (prerequisites, clone, npm ci, npm run dev), Development section (available commands table), Testing section (unit + e2e instructions), Docker section (build and run), Architecture section (brief — "Astro SSR app serving dashboard UI and API routes, backed by SQLite"), link to CONTRIBUTING.md
- [ ] Verify: all commands listed in README actually work
- [ ] Commit: `docs: finalize README with full project documentation`

## Task 11: Steering Document Updates

_Requirements: 2_

- [ ] Update `.kiro/steering/project-conventions.md` to add the final project structure tree (reflecting all files created in Tasks 1–10)
- [ ] Verify: steering docs match actual project state (no references to files that don't exist, no missing files)
- [ ] Commit: `docs: update steering documents with final project structure`

## Task 12: Final Validation

_Requirements: all_

- [ ] Run full validation sequence: `npm run lint && npm run test:coverage && npm run test:e2e && docker build -t statli . && echo "All checks pass"`
- [ ] Verify coverage meets 80% threshold (or document why it's lower with only a noop test — the threshold will be met once Spec 2 adds real code)
- [ ] Verify git log shows clean conventional commits for all tasks
- [ ] Verify no uncommitted changes remain
- [ ] Commit (if any fixes needed): `chore: final validation fixes`

---

## 🛑 CHECKPOINT: Spec 1 Complete

**STOP. Do not proceed to Spec 2 until the user explicitly approves.**

Spec 1 deliverables:
- [x] Repository reset with preserved history
- [x] Steering documents for agents
- [x] Full Astro/TypeScript project with all tooling
- [x] Vitest + Playwright testing infrastructure
- [x] Docker multi-stage build
- [x] GitHub Actions CI pipeline
- [x] CONTRIBUTING.md + README.md
- [x] All tests passing, Docker builds, lint clean

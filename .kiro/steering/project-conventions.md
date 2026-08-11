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

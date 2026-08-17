# Statli

[![CI](https://github.com/jbrinkman/statli/actions/workflows/ci.yml/badge.svg)](https://github.com/jbrinkman/statli/actions/workflows/ci.yml)

Project status tracking dashboard with AI-powered data ingestion.

## Quick Start

**Prerequisites:** Node.js 24+, Docker (optional)

```bash
git clone https://github.com/jbrinkman/statli.git
cd statli
npm ci
cp .env.example .env  # edit with real secrets
npm run dev
```

Open http://localhost:4321.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HOST` | No | Server bind address (default: `0.0.0.0`) |
| `PORT` | No | Server port (default: `4321`) |
| `DATABASE_URL` | No | SQLite path (default: `./data/statli.db`) |
| `AUTH_SECRET` | **Yes** | Better Auth secret, min 32 chars |
| `STATLI_API_KEY` | No | API key for machine clients (MCP, cron) |
| `RESEND_API_KEY` | **Yes** | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | **Yes** | Sender email (must match Resend verified domain) |

Generate secrets:
```bash
openssl rand -base64 32  # AUTH_SECRET
openssl rand -hex 32     # STATLI_API_KEY
```

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Biome lint check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run test` | Unit + integration tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:e2e` | End-to-end tests |

## Database

SQLite with custom migration system. Database file lives in `data/` (gitignored).

Migrations run automatically on startup. Add new migrations in `src/lib/db/migrations/` with ascending numeric prefixes.

## Authentication

Dual auth scheme:
- **Browser sessions**: Better Auth with email/password (cookie-based)
- **Machine clients**: Bearer API key via `Authorization: Bearer <STATLI_API_KEY>`

All `/api/*` routes (except `/api/auth/*`) require authentication.

Password reset emails are delivered through [Resend](https://resend.com). Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (must match a verified Resend domain).

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects (filter: status, category, needs_review) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Soft-delete project |
| POST | `/api/projects/:id/lock` | Lock project |
| POST | `/api/projects/:id/unlock` | Unlock project |
| GET | `/api/projects/:id/reviews` | List review items for project |
| POST | `/api/projects/:id/reviews` | Add review item |
| GET | `/api/projects/:id/history` | Get change history for project |
| GET | `/api/reviews` | List all review items (filter: resolved, type) |
| POST | `/api/reviews/:id/resolve` | Resolve a review item |
| GET | `/api/history` | Global change history (filter: since) |

## Testing

```bash
npm run test              # unit + integration tests (Vitest)
npm run test:coverage     # with 80% threshold enforcement
npm run test:e2e:install  # install Playwright browsers (first time)
npm run test:e2e          # e2e tests (Playwright)
```

## Docker

```bash
docker build -t statli .
docker run --rm -p 127.0.0.1:4321:4321 statli
```

Or run both services (app + MCP server) together:

```bash
cp .env.example .env  # edit with real secrets
docker compose up --build
```

This starts:
- **App** at `http://127.0.0.1:4321` (dashboard + API)
- **MCP** at `http://127.0.0.1:4322/mcp` (agent tools)

## MCP Server

The project includes an MCP (Model Context Protocol) server for AI agent integration. It uses the **streamable HTTP transport** and listens on port 4322 by default.

### Build & Run

```bash
npm run build:mcp             # Compile TypeScript
STATLI_API_KEY=<key> STATLI_API_URL=http://127.0.0.1:4321 npm run start:mcp
```

The MCP endpoint is available at `http://127.0.0.1:4322/mcp`.

### KiroCrew Registration

Add to `~/.kiro/crew/mcp.json`:
```json
{
  "statli": {
    "url": "http://127.0.0.1:4322/mcp"
  }
}
```

### Available Tools (12)

**Project management:** `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`, `lock_project`, `unlock_project`

**Review items:** `list_review_items`, `add_review_item`, `resolve_review_item`

**History:** `get_change_history`

**Reports:** `generate_report`

## Data Seeding

```bash
npm run seed -- --report-path path/to/status-report.md
npm run validate:sources   # compare against Confluence (requires atlas CLI)
```

## Report Generation

```bash
npm run report:generate                          # stdout, last 7 days
npm run report:generate -- --since 2026-08-01    # custom date range
npm run report:generate -- --output report.md    # write to file
```

## Daily Cron

An automated KiroCrew cron job runs at 8am ET to:
- Check submitted PRs for merges/closures (via `gh` CLI)
- Detect releases for merged projects
- Auto-promote `merge_is_complete` projects
- Flag ambiguous situations for human review

**Prerequisites:** `gh` CLI authenticated (`gh auth login`), Statli server running, MCP server registered.

Registration (via KiroCrew):
```
cron_add(name: "statli-daily-update", at_time: "8am", message: "Run the Statli daily update. Read ~/projects/statli/cron/daily-update.md and follow its instructions using the statli MCP tools and gh CLI.")
```

## Architecture

Astro SSR application serving a dashboard UI and API routes, backed by SQLite. Single process — no separate backend service.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

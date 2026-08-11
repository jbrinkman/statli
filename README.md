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

## Architecture

Astro SSR application serving a dashboard UI and API routes, backed by SQLite. Single process — no separate backend service.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

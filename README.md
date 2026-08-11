# Statli

[![CI](https://github.com/jbrinkman/statli/actions/workflows/ci.yml/badge.svg)](https://github.com/jbrinkman/statli/actions/workflows/ci.yml)

Project status tracking dashboard with AI-powered data ingestion.

## Quick Start

**Prerequisites:** Node.js 24+, Docker (optional)

```bash
git clone https://github.com/jbrinkman/statli.git
cd statli
npm ci
npm run dev
```

Open http://localhost:4321.

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Biome lint check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run test` | Unit tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:e2e` | End-to-end tests |

## Testing

```bash
npm run test              # unit tests (Vitest)
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

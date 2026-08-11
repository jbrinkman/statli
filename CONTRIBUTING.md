# Contributing to Statli

## Prerequisites

- Node.js 24+ (see `.node-version`)
- Docker (for container builds)

## Getting Started

```bash
git clone https://github.com/jbrinkman/statli.git
cd statli
npm ci
npm run dev
```

The dev server starts at http://localhost:4321.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Astro dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Check code with Biome |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e:install` | Install Playwright browsers |
| `npm run test:e2e` | Run end-to-end tests |

## Code Style

Biome is the sole linter and formatter — no ESLint, no Prettier.

```bash
npm run lint:fix
```

All code must pass `npm run lint` before commit.

## Testing

### Unit Tests

```bash
npm run test
npm run test:coverage
```

Coverage threshold: 80% (statements, branches, functions, lines).

### End-to-End Tests

```bash
npm run test:e2e:install  # first time only
npm run test:e2e
```

## Docker

```bash
docker build -t statli .
docker run --rm -p 127.0.0.1:4321:4321 statli
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). All commits require DCO signoff:

```bash
git commit -s -m "feat(scope): description"
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

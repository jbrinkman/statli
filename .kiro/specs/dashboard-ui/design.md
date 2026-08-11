# Design: Dashboard UI

## Overview

This design implements the Statli dashboard — a server-rendered kanban board built with Astro components. The dashboard reads project data from the API layer (Spec 2) and renders a swimlane × status grid with project cards. No client-side JavaScript framework is used for MVP; interactivity (tooltips, expandable sections) uses Astro islands with vanilla JS or a lightweight library.

## Architecture

```
┌─────────────────────────────────────────────┐
│              Browser                        │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │         Dashboard Page (SSR)          │  │
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │     Board Component             │  │  │
│  │  │  ┌──────┐ ┌──────┐ ┌──────┐   │  │  │
│  │  │  │Cell  │ │Cell  │ │Cell  │   │  │  │
│  │  │  │Cards │ │Cards │ │Cards │   │  │  │
│  │  │  └──────┘ └──────┘ └──────┘   │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└──────────────┬──────────────────────────────┘
               │ Page request (SSR)
┌──────────────▼──────────────────────────────┐
│         Astro SSR                           │
│         /dashboard route                    │
│         Fetches from API internally         │
└──────────────┬──────────────────────────────┘
               │ Internal fetch (server-side)
┌──────────────▼──────────────────────────────┐
│         API Layer (/api/*)                  │
│         (Spec 2)                            │
└─────────────────────────────────────────────┘
```

## Project Structure (additions to Spec 2)

```
statli/
├── src/
│   ├── components/
│   │   ├── Board.astro            # Full kanban board grid
│   │   ├── Swimlane.astro         # Single swimlane row
│   │   ├── StatusColumn.astro     # Column within a swimlane
│   │   ├── ProjectCard.astro      # Individual project card
│   │   ├── ReviewBadge.astro      # Review items indicator
│   │   ├── Header.astro           # Nav header with user info + logout
│   │   └── ReviewItemsList.astro  # Expandable review items (island)
│   ├── layouts/
│   │   ├── Layout.astro           # Base HTML (from Spec 1)
│   │   └── AuthLayout.astro       # Layout for login/register pages
│   ├── pages/
│   │   ├── index.astro            # Redirect to /dashboard or /login
│   │   ├── dashboard.astro        # Main board page (protected)
│   │   ├── login.astro            # Login form
│   │   └── register.astro         # Registration form
│   ├── styles/
│   │   └── global.css             # CSS custom properties, grid layout, status colors
│   └── lib/
│       └── api-client.ts          # Server-side helper for internal API calls
├── tests/
│   └── e2e/
│       ├── auth-flow.spec.ts      # Login/register e2e
│       └── dashboard.spec.ts      # Board rendering e2e
```

## Key Design Decisions

### 1. Rendering Approach: Full SSR (No SPA)

**Decision:** The dashboard is a server-rendered Astro page. No client-side routing, no SPA framework.

**Rationale:**
- Data changes infrequently (daily cron, occasional manual updates) — no need for real-time reactivity
- SSR gives a fast first paint with zero client JS bundle for the board itself
- Astro islands handle the few interactive bits (review items expansion, tooltips)
- Simpler architecture, fewer dependencies, easier to test

### 2. CSS Approach: Custom Properties + Grid

**Decision:** Vanilla CSS with custom properties for theming, CSS Grid for the board layout.

**Rationale:**
- Keeps the dependency footprint minimal
- CSS Grid is purpose-built for 2D layouts (swimlanes × columns)
- Custom properties enable future dark mode without restructuring
- No Tailwind for MVP — the component count is small enough that scoped styles in `.astro` files are sufficient

**Grid structure:**
```css
.board {
  display: grid;
  grid-template-columns: 200px repeat(5, 1fr); /* label + 5 status columns */
  grid-template-rows: auto; /* one row per swimlane */
  gap: 1px;
}
```

### 3. Status Colors

```css
:root {
  --color-in-progress: #3b82f6;  /* blue */
  --color-submitted: #f59e0b;    /* amber */
  --color-merged: #8b5cf6;       /* purple */
  --color-completed: #10b981;    /* green */
  --color-dropped: #6b7280;      /* gray */
  --color-needs-review: #ef4444; /* red */
  --color-locked: #6b7280;       /* gray */
  --color-recent: #3b82f6;       /* blue border for recently changed */
}
```

### 4. Internal API Client

**Decision:** Dashboard pages call the API internally (server-to-server on localhost) using the authenticated session.

```typescript
// src/lib/api-client.ts
export async function fetchProjects(session: Session, filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`http://127.0.0.1:${process.env.PORT || 4321}/api/projects?${params}`, {
    headers: {
      'Cookie': session.cookie, // Forward session cookie for auth
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const { data } = await response.json();
  return data;
}
```

**Alternative considered:** Import the DAL directly (skip HTTP). Rejected because:
- The API layer adds validation and consistent error handling
- Keeps the dashboard decoupled from DB internals
- Auth middleware ensures consistent access control

### 5. Authentication Pages

Simple server-rendered forms that POST to the Better Auth endpoints:

- `/login` — form with email + password, POSTs to `/api/auth/sign-in`
- `/register` — form with email + password + confirm, POSTs to `/api/auth/sign-up`
- Both redirect to `/dashboard` on success
- `/index.astro` checks session: redirect to `/dashboard` if logged in, `/login` if not

### 6. Board Data Transformation

The API returns a flat list of projects. The dashboard transforms this into the grid structure:

```typescript
// In dashboard.astro frontmatter
const projects = await fetchProjects(session);
const history = await fetchHistory(session, { since: sevenDaysAgo() });

// Group projects by category × status
const board = buildBoard(projects, history);
// Returns: Map<Category, Map<Status, ProjectCard[]>>

// Mark recently changed
const recentProjectIds = new Set(
  history.filter(h => h.field_changed === 'status').map(h => h.project_id)
);
```

### 7. Project Card Component

```astro
---
// ProjectCard.astro
interface Props {
  project: Project;
  isRecent: boolean;
  reviewCount: number;
}
const { project, isRecent, reviewCount } = Astro.props;
---
<article class:list={['card', { recent: isRecent }]}>
  <h3 class="card-name">{project.name}</h3>
  <div class="card-meta">
    {project.pr_urls.length > 0 && (
      <span class="pr-count">{project.pr_urls.length} PR{project.pr_urls.length > 1 ? 's' : ''}</span>
    )}
    {project.locked && <span class="badge locked" title="Locked">🔒</span>}
    {reviewCount > 0 && <ReviewBadge count={reviewCount} projectId={project.id} />}
  </div>
  {isRecent && <span class="recent-indicator">Recently changed</span>}
</article>

<style>
  .card {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.75rem;
    background: var(--card-bg);
  }
  .card.recent {
    border-left: 3px solid var(--color-recent);
  }
</style>
```

### 8. Protected Route Pattern

```astro
---
// dashboard.astro frontmatter
import { auth } from '../lib/auth';

const session = await auth.api.getSession({ headers: Astro.request.headers });
if (!session) {
  return Astro.redirect('/login');
}

// Fetch data with session
const projects = await fetchProjects(session);
// ...
---
```

## Error Handling

- API fetch failures → render a friendly error banner ("Unable to load projects. Please try again.")
- Empty board (no projects) → render the grid structure with empty cells + a "No projects yet" message
- Auth errors → redirect to `/login`

## Testing Strategy

**Playwright e2e tests:**

1. **Auth flow test:** register → login → see dashboard → logout → redirected to login
2. **Board structure test:** login → verify 5 swimlane labels visible → verify 5 column headers
3. **Project cards test:** seed test data via API → login → verify cards appear in correct cells
4. **Highlighting test:** seed a project with recent status change → verify recent indicator visible
5. **Review badge test:** seed a project with unresolved review item → verify badge shows count

**Test data seeding:** Tests use the API (authenticated with a test user) to create projects before asserting on the rendered page. This tests the full stack: API → DB → SSR → rendered HTML.

## Accessibility

- Board uses `role="grid"` with `role="row"` and `role="gridcell"`
- Swimlane headers use `<th scope="row">`
- Status column headers use `<th scope="col">`
- Cards are `<article>` elements with descriptive text
- Color is never the only indicator (badges include text/icons alongside color)
- Focus management: cards are not individually focusable in MVP (no card-level actions); links within cards are focusable

# Tasks: Dashboard UI

> **Hard gate on every task:** Documentation MUST be updated before a task can be marked complete. Update the appropriate documentation:
> - **README.md** — human-facing: getting started, how to run, prerequisites
> - **`.kiro/steering/` files** — agent-facing: conventions, project structure, tool configs, constraints
>
> No duplication between the two. If a task adds something a developer would need to know about, the docs must reflect it.

## Task 1: Create Global Styles and Design Tokens
_Requirements: 7_

- [ ] Create `src/styles/global.css` with CSS custom properties:
  - Status colors: `--color-in-progress: #3b82f6`, `--color-submitted: #f59e0b`, `--color-merged: #8b5cf6`, `--color-completed: #10b981`, `--color-dropped: #6b7280`
  - UI colors: `--color-needs-review: #ef4444`, `--color-locked: #6b7280`, `--color-recent: #3b82f6`
  - Layout tokens: `--border`, `--card-bg`, `--bg`, `--text`, spacing scale, font stack
  - Base reset and typography styles
- [ ] Import `global.css` in `src/layouts/Layout.astro`
- [ ] Update `.kiro/steering/project-conventions.md`: document CSS approach (vanilla CSS + custom properties, no Tailwind), color scheme, design tokens location
- [ ] Verify: `npm run build` succeeds; dev server shows styled page
- [ ] Commit: `style: add global CSS design tokens and base styles`

## Task 2: Create Authentication Pages
_Requirements: 5_

- [ ] Create `src/layouts/AuthLayout.astro` — centered card layout for auth forms
- [ ] Create `src/pages/login.astro`:
  - Form with email + password fields
  - POSTs to `/api/auth/sign-in` via fetch (client-side island)
  - On success: redirect to `/dashboard`
  - On error: display error message inline
- [ ] Create `src/pages/register.astro`:
  - Form with email + password + confirm password fields
  - POSTs to `/api/auth/sign-up` via fetch
  - On success: redirect to `/dashboard`
  - On error: display error message inline
- [ ] Update `src/pages/index.astro`:
  - Check session via Better Auth
  - If authenticated: redirect to `/dashboard`
  - If not: redirect to `/login`
- [ ] Update `README.md`: note that first-time users must register before accessing the dashboard
- [ ] Verify: navigate to `/login`, fill form, submit (should fail without valid credentials but form renders correctly); `/register` renders correctly
- [ ] Commit: `feat: add login and registration pages`

## Task 3: Create Internal API Client
_Requirements: 6_

- [ ] Create `src/lib/api-client.ts` with helper functions:
  - `fetchProjects(request: Request, filters?: Record<string, string>)` — calls `GET /api/projects` forwarding the request's cookies for auth
  - `fetchProjectReviews(request: Request, projectId: string)` — calls `GET /api/projects/:id/reviews?resolved=false`
  - `fetchHistory(request: Request, since?: string)` — calls `GET /api/history?since=...`
  - All functions handle errors gracefully (return error state, don't throw on API errors)
- [ ] Update `.kiro/steering/project-conventions.md`: document internal API client pattern (server-side fetch with cookie forwarding)
- [ ] Verify: `npm run lint` passes; `npm run build` succeeds
- [ ] Commit: `feat: add server-side API client for dashboard data fetching`

## Task 4: Create Board Grid Layout
_Requirements: 1_

- [ ] Create `src/components/Board.astro`:
  - Accepts grouped project data as props
  - Renders CSS Grid with swimlane label column + 5 status columns
  - Column headers: In Progress, Submitted, Merged, Completed, Dropped
  - Row headers: Integration Projects, Valkey Module Projects, Valkey Glide Projects, Valkey Docs/Demos, Infrastructure
  - Each cell renders a `StatusColumn` component
- [ ] Create `src/components/Swimlane.astro`:
  - Renders a row with the swimlane label and 5 status cells
  - Shows project count in the swimlane label
  - Shows review item count badge on swimlane header if any projects have unresolved items
- [ ] Create `src/components/StatusColumn.astro`:
  - Renders a cell containing a list of `ProjectCard` components
  - Shows count of projects in the cell header
  - Empty cells render with a subtle "—" or empty state
- [ ] Add board-specific styles (grid layout, cell borders, header styling)
- [ ] Verify: `npm run build` succeeds; component renders (will be tested with real data in Task 6)
- [ ] Commit: `feat: add kanban board grid layout components`

## Task 5: Create Project Card Component
_Requirements: 2, 3_

- [ ] Create `src/components/ProjectCard.astro`:
  - Displays: project name, PR count (with links to first PR), lock indicator (🔒), review badge
  - Accepts `isRecent` prop — adds `recent` class for left-border highlight
  - Recently-changed cards show "Changed X days ago" subtitle
  - Truncated `drop_reason` shown on hover via `title` attribute
  - Release URL linked if present
- [ ] Create `src/components/ReviewBadge.astro`:
  - Displays count of unresolved review items
  - Red badge with count number
  - Accessible: `aria-label="X review items need attention"`
- [ ] Add card-specific styles (card border, padding, recent indicator, badges)
- [ ] Verify: `npm run lint` passes; `npm run build` succeeds
- [ ] Commit: `feat: add project card and review badge components`

## Task 6: Create Dashboard Page
_Requirements: 1, 3, 4, 6_

- [ ] Create `src/pages/dashboard.astro`:
  - Check session — redirect to `/login` if not authenticated
  - Fetch all projects via internal API client
  - Fetch change history for last 7 days
  - Fetch review items (unresolved) for all projects
  - Transform data: group projects by category × status, mark recently-changed, attach review counts
  - Render Header component + Board component
  - Show total unresolved review items count at top ("X items need review")
  - Handle API errors gracefully (show error banner, not blank page)
- [ ] Create `src/components/Header.astro`:
  - Shows "Statli" branding/title
  - Shows logged-in user email
  - Logout button (POSTs to `/api/auth/sign-out`, redirects to `/login`)
- [ ] Verify: `npm run dev` shows dashboard page (empty board if no projects seeded); login required
- [ ] Update `README.md`: document dashboard access at `/dashboard` after login
- [ ] Commit: `feat: implement dashboard page with board rendering`

## CHECKPOINT: Pause for human review
_At this point: auth flow works, board renders with correct grid structure, cards display in correct positions. Visual review before final polish and testing._

## Task 7: Implement Review Items Expansion
_Requirements: 4_

- [ ] Create `src/components/ReviewItemsList.astro` (Astro island with `client:visible` or `client:click`):
  - When review badge is clicked, expands to show list of unresolved review items
  - Each item shows: type, reason, created date
  - Provides a "Resolve" button (calls `POST /api/reviews/:id/resolve` via fetch)
  - Collapses when clicked again
- [ ] Wire ReviewBadge to trigger ReviewItemsList expansion
- [ ] Verify: click review badge → items appear → click resolve → item disappears from list
- [ ] Commit: `feat: add expandable review items list on project cards`

## Task 8: Write E2E Tests for Auth Flow
_Requirements: 8_

- [ ] Create `tests/e2e/auth-flow.spec.ts`:
  - Test: navigate to `/` → redirected to `/login`
  - Test: register a new user → redirected to `/dashboard`
  - Test: logout → redirected to `/login`
  - Test: login with registered user → see dashboard
  - Test: access `/dashboard` without session → redirected to `/login`
- [ ] Verify: `npm run test:e2e` passes for auth tests
- [ ] Commit: `test: add e2e tests for authentication flow`

## Task 9: Write E2E Tests for Dashboard
_Requirements: 8_

- [ ] Create `tests/e2e/dashboard.spec.ts`:
  - Test helper: register + login to get authenticated session, seed test projects via API
  - Test: board shows 5 swimlane row headers (Integration Projects, Valkey Module Projects, etc.)
  - Test: board shows 5 column headers (In Progress, Submitted, Merged, Completed, Dropped)
  - Test: seeded project card appears in correct swimlane/column cell
  - Test: project with recent status change shows "recently changed" indicator
  - Test: project with unresolved review item shows review badge with count
  - Test: project with `locked: true` shows lock indicator
  - Test: total review items count appears at top of dashboard
- [ ] Verify: `npm run test:e2e` passes all dashboard tests
- [ ] Commit: `test: add e2e tests for dashboard board rendering`

## Task 10: Accessibility Pass
_Requirements: 7, NFR_

- [ ] Audit board for accessibility:
  - Add `role="grid"`, `role="row"`, `role="gridcell"` to board structure
  - Add `scope="row"` to swimlane headers, `scope="col"` to status headers
  - Verify color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for UI components)
  - Add `aria-label` to review badges and indicators
  - Ensure all interactive elements (links, buttons) have visible focus styles
- [ ] Verify: no accessibility errors from automated tools (run Playwright `axe-core` check or manual audit)
- [ ] Commit: `a11y: add ARIA roles and verify color contrast`

## Task 11: Final Documentation Pass
_Requirements: all_

- [ ] Update `README.md`:
  - Document dashboard URL (`/dashboard`)
  - Document first-time setup flow (register → login → view board)
  - Note that the board is empty until projects are seeded (Spec 3)
- [ ] Update `.kiro/steering/project-conventions.md`:
  - Document component structure (`src/components/`)
  - Document page structure (`src/pages/dashboard.astro`, login, register)
  - Document CSS approach and design token location
  - Document the internal API client pattern
- [ ] Verify: all documented workflows function correctly; build, lint, and all tests pass
- [ ] Commit: `docs: update documentation for dashboard UI`

## CHECKPOINT: Final review
_All requirements satisfied. Dashboard renders a kanban board with 5 swimlanes × 5 columns, project cards with highlighting and review badges, auth flow, expandable review items, e2e tests passing, accessible markup. Ready for Spec 5 (Daily Cron + Report Generation)._

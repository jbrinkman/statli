# Requirements: Dashboard UI

## Goal

Implement the Statli v2 dashboard — a kanban-style board that provides a live view of all projects organized by category (swimlanes) and status (columns). The dashboard reads from the API layer (Spec 2) and highlights recently-changed and flagged items so a product manager can glance at it and immediately understand project progress.

## Requirements

### 1. Kanban Board Layout

**User Story:** As a product manager, I want to see all projects organized by category and status on a single board, so that I can get a complete view of my team's work at a glance.

**Acceptance Criteria:**
- THE SYSTEM SHALL render a kanban board with 5 swimlane rows (categories) and 5 status columns
- Swimlane rows (top to bottom): Integration Projects, Valkey Module Projects, Valkey Glide Projects, Valkey Docs/Demos, Infrastructure
- Status columns (left to right): In Progress, Submitted, Merged, Completed, Dropped
- WHEN the dashboard loads THEN it SHALL display all non-deleted projects in their correct swimlane and column intersection
- THE SYSTEM SHALL show a count of projects in each swimlane/column cell
- THE SYSTEM SHALL be responsive — usable on screens 1280px and wider (laptop minimum)

### 2. Project Cards

**User Story:** As a product manager, I want each project displayed as a card with key information visible, so that I can understand its state without clicking into it.

**Acceptance Criteria:**
- EACH project card SHALL display: project name, and a count/indicator of associated PRs
- IF a project has unresolved review items THEN the card SHALL display a visual "needs review" indicator (e.g., badge or icon)
- IF a project is locked THEN the card SHALL display a lock indicator
- IF a project has a `drop_reason` THEN the card SHALL show a truncated reason on hover/tooltip
- IF a project has `release_url` THEN the card SHALL link to the release
- THE SYSTEM SHALL link PR URLs on the card so they are clickable

### 3. Recently Changed Highlighting

**User Story:** As a product manager, I want recently-changed projects visually highlighted, so that I can quickly spot what's new since I last looked.

**Acceptance Criteria:**
- WHEN a project's status changed within the last 7 days THEN its card SHALL be visually distinguished (e.g., colored border, "new" badge, or sorted to top of its cell)
- THE SYSTEM SHALL determine "recently changed" by querying the change_history table for status changes within the last 7 days
- THE SYSTEM SHALL allow the user to see when the last status change occurred (e.g., "Changed 2 days ago" subtitle or tooltip)

### 4. Review Items Visibility

**User Story:** As a product manager, I want to see which projects need my attention, so that I can prioritize reviewing flagged items.

**Acceptance Criteria:**
- THE SYSTEM SHALL display a summary count of total unresolved review items at the top of the dashboard (e.g., "5 items need review")
- WHEN a swimlane contains projects with unresolved review items THEN the swimlane header SHALL show a count
- THE SYSTEM SHALL provide a way to view the list of unresolved review items for a project (e.g., expandable section or modal when clicking the review badge)

### 5. Authentication Flow

**User Story:** As a user, I want to log in before seeing the dashboard, so that the data is protected from unauthorized access.

**Acceptance Criteria:**
- WHEN an unauthenticated user navigates to `/` THEN they SHALL be redirected to a login page
- THE SYSTEM SHALL provide a login page at `/login` with email/password fields
- THE SYSTEM SHALL provide a registration page at `/register` for first-time setup
- WHEN authenticated THEN the user SHALL be redirected to the dashboard at `/dashboard`
- THE SYSTEM SHALL display the logged-in user's email and a logout button in the header

### 6. Dashboard Data Loading

**User Story:** As a user, I want the dashboard to load quickly with fresh data, so that I always see the current state of projects.

**Acceptance Criteria:**
- THE SYSTEM SHALL fetch project data from the API on each page request (SSR — no stale cache)
- THE SYSTEM SHALL fetch data using the authenticated user's session (server-side API calls within Astro)
- IF the API returns an error THEN the dashboard SHALL display a user-friendly error message (not a blank page or stack trace)
- THE SYSTEM SHALL load the dashboard in under 2 seconds for up to 200 projects

### 7. Styling and Design System

**User Story:** As a user, I want the dashboard to look clean and professional, so that it's pleasant to use daily.

**Acceptance Criteria:**
- THE SYSTEM SHALL use a minimal CSS approach (no heavy framework — either Tailwind CSS or vanilla CSS with custom properties)
- THE SYSTEM SHALL support light mode (dark mode is a future enhancement)
- THE SYSTEM SHALL use consistent spacing, typography, and color for status indicators:
  - In Progress: blue
  - Submitted: yellow/amber
  - Merged: purple
  - Completed: green
  - Dropped: gray
- THE SYSTEM SHALL use semantic HTML for accessibility (proper headings, landmarks, ARIA labels where needed)

### 8. Testing

**User Story:** As a developer, I want the dashboard UI tested, so that I can refactor with confidence.

**Acceptance Criteria:**
- THE SYSTEM SHALL include Playwright e2e tests for:
  - Login flow (register, login, see dashboard)
  - Board renders with correct swimlanes and columns
  - Project cards appear in correct positions
  - Recently-changed highlighting is visible
  - Review item indicators are present
- WHEN `npm run test:e2e` is executed THEN all dashboard tests SHALL pass
- THE SYSTEM SHALL maintain 80% coverage threshold across the project

## Non-Functional Requirements

- **Performance:** Dashboard page load (SSR + render) SHALL complete in under 2 seconds with 200 projects
- **Accessibility:** WCAG 2.1 AA compliance for color contrast, keyboard navigation, and screen reader labels
- **Browser support:** Latest versions of Chrome, Firefox, Safari
- **No JavaScript-heavy framework required for MVP:** Astro components + islands architecture is sufficient; React/Vue can be added later if interactivity demands grow

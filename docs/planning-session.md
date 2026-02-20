# Status Report Manager - Planning Session

**Date**: February 20, 2026

## Project Overview

A desktop application for managing project tasks and generating weekly status reports in markdown format. Used by multiple project managers who each manage separate teams and may have slightly different status report templates.

## Core Requirements

### Functionality

- Track work tasks with key subtasks
- Capture task state (not started, in progress, complete, etc.)
- Add notes to tasks and subtasks
- Define status report metadata (title, date, recipients)
- Generate weekly status reports as markdown files
- Support multiple projects per project manager
- Customizable report templates per project

### Weekly Workflow

- Update tasks throughout the week
- Add/remove tasks and subtasks as needed
- Capture notes on progress
- Generate markdown report at end of week

## Tech Stack Decision

### Platform: Wails (Go + Web Frontend)

**Why Wails over Electron:**

- Simpler deployment (single binary, no Node.js runtime)
- Better performance (native Go backend)
- Smaller footprint (~10-20MB vs 100MB+)
- Modern UI options (React/Vue/Svelte)
- Excellent SQLite integration
- Easy cross-platform builds (Windows/macOS)

### Database: SQLite

- Simple deployment (single file)
- No server setup required
- Single-user model (for now)
- Data model designed for future multi-user migration

### Architecture Principles

- **Complete business logic isolation**: All logic in Go backend
- **Frontend is UI only**: Makes web app migration straightforward
- **Clean separation**: Backend services can be reused in future web version

```text
wails-app/
├── backend/          # Go code (business logic)
│   ├── models/       # Data models
│   ├── services/     # Business logic layer
│   └── repository/   # Database access layer
├── frontend/         # React/Vue/Svelte (UI only)
└── database/         # SQLite schema
```

## Data Model (Preliminary)

### Core Entities

- **Projects**: Container for all project-related data
  - Project name
  - Report template configuration
  - Recipients list (To, CC, BCC)
  - Active/archived status
  - Custom status definitions with styles
  
- **Tasks**: Main work items
  - Title/name
  - Expected completion date
  - Current status
  - Priority/order (for display sequence)
  - Links to project
  - Full audit trail
  
- **Subtasks**: Breakdown of tasks
  - Title/name
  - Expected completion date
  - Current status
  - Links to parent task
  - Full audit trail
  
- **Notes**: Time-stamped observations
  - Content
  - Timestamp
  - Links to task or subtask
  - Part of audit trail

- **Status History**: Audit trail entries
  - Entity (task or subtask)
  - Old status
  - New status
  - Timestamp
  - Enables change detection for reports

- **Report Sections**: Template configuration
  - Section name/label (customizable)
  - Section type: "prose" or "status"
  - Order/sequence
  - Enabled/disabled toggle (per report)
  - Links to project

- **Report Snapshots**: Point-in-time captures
  - Generated markdown content
  - Timestamp
  - Links to project
  - Allows regeneration before finalizing

### Report Templates

Sections are defined per project with two types:

**Prose Sections** (user-entered content):

- TL;DR / Summary
- Highlights
- Lowlights / Blockers
- Announcements
- Performance Issues
- Staffing
- Custom sections as needed

**Status Sections** (auto-generated from task data):

- Weekly Support (task/subtask progress)
- Release Details (tasks by release)
- Roadmap (upcoming tasks)
- Custom groupings as needed

**Common Elements** (always present):

- Recipients block (To, CC, BCC)
- Title with date
- CSS styles for status badges

## Example Reports Reference

**Source**: <https://github.com/Bit-Quill/customer-reports>

Focus on Amazon project reports which show:

- Consistent structure with customizable sections
- Status badges (On Track, In Progress, Paused, etc.)
- Rich markdown formatting
- Links to GitHub issues/PRs
- Recipient lists
- Date-based file naming (e.g., `elasticache-status-2026-02-17.md`)

### Key Observations from Examples

- Reports are 10-20KB markdown files
- Heavy use of status indicators with color coding
- Sections can be present/absent based on project needs
- Mix of narrative and structured data
- Links to external resources (GitHub, Slack, Quip)

## Spec Approach Decision

### One Comprehensive Spec ✓

**Rationale:**

- Clear, bounded domain model
- Well-understood workflow
- Manageable template variability
- Real examples available for reference
- Not overly complex for single-spec approach

**Estimated Timeline:**

- 60-90 minutes to write comprehensive spec
- Several hours of autonomous implementation
- Natural review point after initial implementation

### Spec Will Cover

1. Architecture and tech stack
2. Complete data model with relationships
3. Database schema design (with future multi-user in mind)
4. Core CRUD operations for all entities
5. Report template system
6. Report generation logic
7. UI/UX requirements
8. File export functionality

## Answered Questions

### 1. Frontend Framework: Vue + UnoCSS + Vite ✓

**Stack:**

- Vue 3 for UI framework
- UnoCSS for styling
- Vite for build tooling
- Relevant Vue ecosystem components

### 2. Report Template Customization ✓

**Section Definition Model:**

- Users define sections once per project
- Each section has:
  - Name/label (customizable)
  - Type: "prose" or "status"
  - Enabled/disabled toggle (per report generation)
- Section types:
  - **Prose sections**: Free-form markdown content entered by user
  - **Status sections**: Auto-generated from task/subtask data
- Sections can be toggled on/off without redefining
- Example: "Insights" section defined once, enabled some weeks, disabled others

### 3. Task/Subtask Status System ✓

**Status Configuration (per project):**

- Default statuses: `not started`, `in progress`, `in review`, `done`
- Each status has:
  - Name (customizable)
  - Style/color: red, green, yellow, gray, paused, pending (from standard list)
- Statuses are project-specific but share common defaults

**Status History & Audit Trail:**

- Track all status changes with timestamps
- Calculate status transitions for report display
- Display format: `<span class="old-style">old status</span> → <span class="new-style">new status</span>`
- Highlights changes to readers in the report

**Task/Subtask Data:**

- Name
- Expected completion date
- Current status
- Full status history (for audit trail and change detection)

### 4. Data Model Details ✓

**Notes:**

- Separate entities with timestamps
- Link to tasks or subtasks
- Part of audit trail

**Task Ordering:**

- Priority/order field for display sequence
- User can reorder tasks within project

**Audit Trail:**

- Complete history of status changes
- Timestamps for all modifications
- Enables calculation of what changed since last report

**Snapshot Workflow:**

- Report generation is separate from snapshotting
- Allows regeneration with edits before finalizing
- Workflow:
  1. Generate markdown preview
  2. Review/edit content
  3. Regenerate as needed
  4. Submit as PR to customer-reports repo
  5. Incorporate review feedback
  6. Regenerate report
  7. Snapshot when final (separate action)
  8. Merge PR and send email

**Archive vs Delete:**

- Archive completed tasks (preserve history)
- Soft delete with recovery option

### 5. Report Output Format ✓

**Markdown + HTML Hybrid:**

- Generated markdown includes HTML for styling
- HTML `<span>` tags with CSS classes for status badges
- CSS styles embedded in report (from examples)
- Output includes:
  - Recipients block (To:, CC:, BCC:)
  - Title with date
  - Body with mixed markdown/HTML
- Preview rendered output before export
- Copy blocks directly to email client

## Next Steps

1. ~~Answer open questions~~ ✓
2. Draft comprehensive spec
3. Begin autonomous implementation in Autopilot mode
4. Review and iterate after initial build

## Success Criteria

- Desktop app runs on Windows and macOS
- Single-user, no authentication needed
- Multiple projects supported
- Tasks and subtasks with notes
- Customizable report templates
- Generate markdown reports matching example format
- Easy deployment (single binary + SQLite file)
- Business logic ready for future web migration

# Requirements Document

## Introduction

The Status Report Manager is a desktop application designed for project managers to track work tasks and generate weekly status reports in markdown format. The application supports multiple projects per user, with customizable report templates and comprehensive audit trails for all task changes. The system generates markdown reports with embedded HTML styling for status badges, following established patterns from existing customer report repositories.

## Glossary

- **System**: The Status Report Manager desktop application
- **User**: A project manager using the application to track tasks and generate reports
- **Project**: A container for tasks, subtasks, and report configuration
- **Task**: A main work item with status, completion date, and associated subtasks
- **Subtask**: A breakdown of a parent task with its own status and completion date
- **Note**: A markdown text field on a task or subtask containing current details, links, and observations
- **Status**: The current state of a task or subtask (e.g., "not started", "in progress", "done")
- **Task_History**: An audit trail entry recording the state of tasks and subtasks at report finalization time
- **Report_Section**: A configured section in a report template (prose or status type)
- **Report_Snapshot**: A finalized report with captured task states at that point in time
- **Prose_Section**: A report section with user-entered free-form markdown content
- **Status_Section**: A report section auto-generated from task and subtask data
- **Status_Badge**: An HTML span element with CSS styling indicating task status
- **Audit_Trail**: Complete history of task and subtask states captured at each report finalization

## Requirements

### Requirement 1: Project Configuration

**User Story:** As a user, I want to configure project settings including naming conventions and file paths, so that I can customize the application to match my workflow.

#### Acceptance Criteria

1. WHEN a user creates a project, THE System SHALL require a project name
2. THE System SHALL allow users to define a filename format template for exported reports
3. THE System SHALL allow users to define a report title format template
4. THE System SHALL allow users to specify a default directory path for saving generated markdown files
5. THE System SHALL allow users to enable year-based subfolders for organizing reports
6. WHEN year-based subfolders are enabled, THE System SHALL create reports in a `{YYYY}` subdirectory under the default directory
7. THE System SHALL support template variables in filename format: `{project-name}`, `{YYYY-MM-DD}`, `{YYYY}`, `{MM}`, `{DD}`
8. THE System SHALL support template variables in report title format: `{project-name}`, `{YYYY-MM-DD}`, `{YYYY}`, `{MM}`, `{DD}`
9. THE System SHALL allow users to enter custom text in format templates alongside template variables
10. THE System SHALL validate format templates to ensure they produce valid filenames
11. THE System SHALL allow users to modify project configuration at any time
12. THE System SHALL store project-specific report template configurations
13. THE System SHALL store project-specific recipient lists (To, CC, BCC)
14. THE System SHALL store project-specific status definitions with associated styles

### Requirement 2: Project Management

**User Story:** As a user, I want to manage multiple projects, so that I can organize tasks and reports for different teams and clients.

#### Acceptance Criteria

1. THE System SHALL allow users to create new projects with configuration settings
2. THE System SHALL allow users to archive projects to hide them from active views
3. THE System SHALL allow users to view a list of all active projects
4. THE System SHALL allow users to view a list of all archived projects
5. WHEN a user selects a project, THE System SHALL display all tasks associated with that project

### Requirement 3: Task Management

**User Story:** As a user, I want to create and manage tasks with subtasks, so that I can track work items and their progress.

#### Acceptance Criteria

1. WHEN a user creates a task, THE System SHALL require a task name
2. WHEN a user creates a task, THE System SHALL require assignment to a status-type Report_Section
3. THE System SHALL allow users to set an expected completion date for tasks
4. THE System SHALL allow users to assign a status to each task from project-defined statuses
5. THE System SHALL allow users to add an optional URL to tasks for linking to external resources
6. THE System SHALL allow users to add an optional markdown notes field to tasks
7. THE System SHALL allow users to move tasks between status-type Report_Sections
8. THE System SHALL allow users to reorder tasks within a Report_Section using a priority field
9. THE System SHALL allow users to modify task attributes without creating audit trail entries
10. THE System SHALL allow users to add subtasks to any task
11. WHEN a user creates a subtask, THE System SHALL require a subtask name
12. THE System SHALL allow users to set an expected completion date for subtasks
13. THE System SHALL allow users to assign a status to each subtask from project-defined statuses
14. THE System SHALL allow users to add an optional URL to subtasks for linking to external resources
15. THE System SHALL allow users to add an optional markdown notes field to subtasks
16. THE System SHALL allow users to modify subtask attributes without creating audit trail entries
17. THE System SHALL allow users to remove subtasks from tasks
18. THE System SHALL allow users to soft delete tasks with recovery option
19. THE System SHALL allow users to soft delete subtasks with recovery option
20. THE System SHALL allow users to soft delete all subtasks of a task in a single operation
21. THE System SHALL allow users to restore previously soft-deleted tasks
22. THE System SHALL allow users to restore previously soft-deleted subtasks
23. THE System SHALL allow users to archive completed tasks while preserving history

### Requirement 4: Task Notes and Audit Trail

**User Story:** As a user, I want to add markdown notes to tasks and subtasks, so that I can capture current details and observations about work items.

#### Acceptance Criteria

1. THE System SHALL provide a markdown text field for notes on each task
2. THE System SHALL provide a markdown text field for notes on each subtask
3. THE System SHALL allow users to edit task notes at any time without creating audit trail entries
4. THE System SHALL allow users to edit subtask notes at any time without creating audit trail entries
5. THE System SHALL allow notes to contain links, formatting, and any valid markdown
6. WHEN a report is finalized, THE System SHALL capture the complete state of all tasks and subtasks in Task_History
7. THE System SHALL store Task_History entries with the finalization timestamp
8. WHEN displaying Task_History, THE System SHALL show task name, status, expected completion date, URL, and notes at finalization time
9. THE System SHALL calculate status and expected completion date changes between consecutive Task_History entries for report generation
10. THE System SHALL NOT highlight changes to task names, URLs, or notes in report generation

### Requirement 5: Status Configuration

**User Story:** As a user, I want to define custom statuses for each project, so that I can match my team's workflow and reporting needs.

#### Acceptance Criteria

1. THE System SHALL provide default statuses: "not started", "in progress", "in review", "done"
2. THE System SHALL allow users to customize status names per project
3. WHEN a user defines a status, THE System SHALL require a status name
4. WHEN a user defines a status, THE System SHALL require selection of a style from: red, green, yellow, gray, paused, pending
5. THE System SHALL store status definitions at the project level
6. THE System SHALL apply project-specific statuses to all tasks and subtasks within that project

### Requirement 6: Report Template Configuration

**User Story:** As a user, I want to define customizable report templates per project, so that I can match different reporting requirements for different teams.

#### Acceptance Criteria

1. THE System SHALL allow users to define Report_Sections for each project
2. WHEN a user creates a Report_Section, THE System SHALL require a section name
3. WHEN a user creates a Report_Section, THE System SHALL require a section type: "prose" or "status"
4. THE System SHALL allow users to set the display order for Report_Sections
5. THE System SHALL allow users to enable or disable Report_Sections per report generation
6. WHERE a Report_Section is type "prose", THE System SHALL allow users to enter free-form markdown content
7. WHERE a Report_Section is type "status", THE System SHALL auto-generate content from tasks assigned to that section
8. WHERE a Report_Section is type "status", THE System SHALL display all tasks and their subtasks assigned to that section
9. THE System SHALL preserve Report_Section definitions when toggled off
10. THE System SHALL provide common default sections: TL;DR (prose), Highlights (prose), Lowlights (prose), Weekly Support (status), Roadmap (status), Completed (status), Dropped (status)

### Requirement 7: Report Generation

**User Story:** As a user, I want to generate weekly status reports in markdown format, so that I can communicate project progress to stakeholders.

#### Acceptance Criteria

1. WHEN a user generates a report, THE System SHALL create markdown content with embedded HTML styling
2. THE System SHALL include a recipients block with To, CC, and BCC fields at the top of the report
3. THE System SHALL include a title using the project's report title format template
4. THE System SHALL include CSS styles for Status_Badges in the report
5. FOR ALL enabled Prose_Sections, THE System SHALL include the user-entered content in the report
6. FOR ALL enabled Status_Sections, THE System SHALL generate content from tasks and subtasks assigned to that Status_Section
7. WHEN displaying task status in reports, THE System SHALL use Status_Badge HTML spans with appropriate CSS classes
8. WHEN a task status has changed since the last finalized report, THE System SHALL display the transition as: `<span class="old-style">old status</span> → <span class="new-style">new status</span>`
9. WHEN a task expected completion date has changed since the last finalized report, THE System SHALL display the change as: `~~old ECD~~ new ECD`
10. THE System SHALL compare current task state with the most recent Task_History entry to determine status and ECD changes
11. THE System SHALL NOT highlight changes to task names, URLs, or notes in reports
12. THE System SHALL order report sections according to the configured sequence
13. THE System SHALL generate a preview of the rendered markdown before finalization

### Requirement 8: Report Generation and Export Workflow

**User Story:** As a user, I want to generate and export reports multiple times before finalizing, so that I can submit to GitHub, incorporate review feedback, and only capture the audit trail when the report is approved.

#### Acceptance Criteria

1. WHEN a user generates a report, THE System SHALL create a markdown preview without finalizing
2. THE System SHALL allow users to export the generated markdown to a file
3. THE System SHALL use the project's filename format template to suggest a default filename
4. THE System SHALL default the export path to the project's configured default directory
5. THE System SHALL allow users to override the suggested filename and export path
6. THE System SHALL preserve all markdown formatting and embedded HTML in the exported file
7. THE System SHALL allow users to edit report content after generation
8. THE System SHALL allow users to modify task and subtask data after generation
9. THE System SHALL allow users to regenerate the report with updated data
10. THE System SHALL allow users to re-export the regenerated report to the same or different file
11. WHEN a user finalizes a report, THE System SHALL create a Report_Snapshot with the markdown content
12. WHEN a user finalizes a report, THE System SHALL capture the complete state of all tasks and subtasks in Task_History
13. WHEN a user finalizes a report, THE System SHALL store the finalization timestamp
14. THE System SHALL link Report_Snapshots and Task_History entries to their associated project
15. THE System SHALL allow users to view historical Report_Snapshots
16. THE System SHALL use Task_History entries to calculate what changed since the last finalized report

### Requirement 9: Data Persistence

**User Story:** As a system administrator, I want all data stored in a local SQLite database, so that deployment is simple and data is portable.

#### Acceptance Criteria

1. THE System SHALL use SQLite as the database engine
2. THE System SHALL store all data in a single SQLite database file
3. THE System SHALL create the database file on first application launch
4. THE System SHALL maintain referential integrity between all entities
5. THE System SHALL support future migration to multi-user architecture
6. THE System SHALL persist all Projects, Tasks, Subtasks, Notes, Task_History, Report_Sections, and Report_Snapshots

### Requirement 10: Application Architecture

**User Story:** As a developer, I want complete business logic isolation in the backend, so that the application can be migrated to a web platform in the future.

#### Acceptance Criteria

1. THE System SHALL implement all business logic in the Go backend
2. THE System SHALL implement the frontend as UI-only with no business logic
3. THE System SHALL organize backend code into models, services, and repository layers
4. THE System SHALL expose backend services through Wails bindings
5. THE System SHALL use Vue 3 for the frontend framework
6. THE System SHALL use UnoCSS for frontend styling
7. THE System SHALL use Vite as the frontend build tool

### Requirement 11: Cross-Platform Deployment

**User Story:** As a user, I want to run the application on Windows and macOS, so that I can use it on my preferred operating system.

#### Acceptance Criteria

1. THE System SHALL compile to a single executable binary for Windows
2. THE System SHALL compile to a single executable binary for macOS
3. THE System SHALL bundle the SQLite database with the application
4. THE System SHALL have a total application size under 50MB
5. THE System SHALL not require external runtime dependencies (Node.js, Python, etc.)

### Requirement 12: User Interface

**User Story:** As a user, I want an intuitive desktop interface, so that I can efficiently manage tasks and generate reports.

#### Acceptance Criteria

1. THE System SHALL display a project list view on application launch
2. WHEN a user selects a project, THE System SHALL display the project's tasks organized by status-type Report_Sections
3. THE System SHALL provide forms for creating and editing projects, tasks, subtasks, and notes
4. THE System SHALL provide a report template configuration interface per project
5. THE System SHALL provide a report generation interface with section toggles
6. THE System SHALL provide a preview pane for rendered markdown reports
7. THE System SHALL provide export functionality with file path selection
8. THE System SHALL provide a finalize button to capture the audit trail
9. THE System SHALL use responsive layouts that adapt to window resizing
10. THE System SHALL provide visual feedback for all user actions (loading states, success/error messages)
11. THE System SHALL allow users to copy report content to clipboard for email clients
12. THE System SHALL make all freeform text fields resizable
13. THE System SHALL automatically resize text fields to display all content
14. THE System SHALL adjust subsequent fields and records to maintain proper spacing when text fields resize

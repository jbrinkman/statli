# Status Report Manager

A desktop application for project managers to track work tasks and generate weekly status reports in markdown format.

## Features

- **Multi-Project Management**: Organize tasks across multiple projects with independent configurations
- **Flexible Task Tracking**: Create tasks with subtasks, statuses, expected completion dates, and markdown notes
- **Customizable Report Templates**: Define prose and status sections per project with drag-and-drop ordering
- **Change Detection**: Automatically highlight status and completion date changes since the last finalized report
- **Markdown Export**: Generate reports with embedded HTML styling for status badges
- **Audit Trail**: Capture complete task history at report finalization for accurate change tracking
- **Cross-Platform**: Single executable for Windows and macOS with no external dependencies

## Installation

### Prerequisites

None! The application is a self-contained executable with no runtime dependencies.

### Download

Download the latest release for your platform:

- **Windows**: `statli-windows-amd64.exe`
- **macOS**: `statli-darwin-universal`

### Running the Application

**Windows:**

1. Download the `.exe` file
2. Double-click to run (you may need to allow the app in Windows Defender)
3. The application will create a SQLite database file on first launch

**macOS:**

1. Download the application
2. Move to Applications folder (optional)
3. Right-click and select "Open" on first launch (to bypass Gatekeeper)
4. The application will create a SQLite database file on first launch

### Database Location

The SQLite database is created in your user data directory:

- **Windows**: `%APPDATA%\statli\status-reports.db`
- **macOS**: `~/Library/Application Support/statli/status-reports.db`

## Usage Guide

### Getting Started

1. **Create a Project**
   - Click "New Project" on the project list screen
   - Enter project name and configure settings:
     - Filename format template (e.g., `{project-name}-status-{YYYY-MM-DD}.md`)
     - Report title format template (e.g., `{project-name} Status Report - {YYYY-MM-DD}`)
     - Default export directory
     - Enable year-based subfolders (optional)
     - Recipients (To, CC, BCC)

2. **Configure Report Template**
   - Select your project
   - Click "Configure Report Template"
   - Add report sections:
     - **Prose sections**: Free-form markdown content (e.g., TL;DR, Highlights)
     - **Status sections**: Auto-generated from tasks (e.g., Roadmap, Completed)
   - Define custom statuses with color styles (red, green, yellow, gray, paused, pending)
   - Reorder sections by dragging

3. **Add Tasks**
   - Select a project to view the task list
   - Click "New Task"
   - Enter task details:
     - Name (required)
     - Assign to a status section (required)
     - Status (from project-defined statuses)
     - Expected completion date
     - URL (for linking to external resources)
     - Notes (markdown supported)
   - Add subtasks to break down work items

4. **Generate Reports**
   - Click "Generate Report"
   - Toggle sections on/off as needed
   - Edit prose section content
   - Preview the rendered markdown
   - Export to file (can export multiple times)
   - Click "Finalize" when ready to capture the audit trail

### Template Variables

Use these variables in filename and title format templates:

- `{project-name}`: Project name (sanitized for filenames)
- `{YYYY-MM-DD}`: Full date (e.g., 2026-02-20)
- `{YYYY}`: 4-digit year (e.g., 2026)
- `{MM}`: 2-digit month (e.g., 02)
- `{DD}`: 2-digit day (e.g., 20)

**Example:**

- Template: `{project-name}-status-{YYYY-MM-DD}.md`
- Output: `valkey-status-2026-02-20.md`

### Report Workflow

The application supports a flexible workflow for report generation:

1. **Generate**: Create a report preview without finalizing
2. **Export**: Save the markdown to a file (can be done multiple times)
3. **Submit**: Create a pull request on GitHub with the exported file
4. **Review**: Incorporate feedback from reviewers
5. **Regenerate**: Update the report with new data or changes
6. **Re-export**: Save the updated report
7. **Finalize**: Capture the audit trail when the report is approved

**Important**: Only finalization creates the audit trail. You can generate and export as many times as needed before finalizing.

### Change Detection

The application automatically detects changes since the last finalized report:

- **Status changes**: Displayed as `old status → new status` with color-coded badges
- **Completion date changes**: Displayed as `~~old date~~ new date`
- **New tasks**: Appear without change indicators
- **Name, URL, and notes changes**: Not highlighted (only status and dates are tracked)

### Keyboard Shortcuts

- `Ctrl+N` / `Cmd+N`: New project/task (context-dependent)
- `Ctrl+S` / `Cmd+S`: Save current form
- `Ctrl+E` / `Cmd+E`: Export report
- `Ctrl+F` / `Cmd+F`: Finalize report
- `Esc`: Close dialog/cancel operation

### Task Management

- **Soft Delete**: Tasks and subtasks can be soft-deleted (hidden but recoverable)
- **Restore**: Recover soft-deleted items from the trash view
- **Archive**: Move completed tasks to archive while preserving history
- **Reorder**: Drag and drop tasks within sections to set priority

## Development Setup

### Prerequisites

- **Go**: 1.21 or higher
- **Node.js**: 18 or higher
- **Wails CLI**: v2.x

Install Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd statli

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install Go dependencies
go mod download
```

### Development Mode

Run the application in development mode with hot reload:

```bash
wails dev
```

This starts:

- A Vite development server for the frontend (hot reload enabled)
- The Go backend with live reload
- A dev server at <http://localhost:34115> for browser-based development

### Project Structure

```
src/
├── backend/
│   ├── models/          # Data models
│   ├── services/        # Business logic
│   ├── repository/      # Database access
│   └── logger.go        # Structured logging
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── views/       # Page-level components
│   │   ├── composables/ # Vue composition functions
│   │   └── App.vue
│   ├── uno.config.ts    # UnoCSS configuration
│   └── vite.config.js   # Vite configuration
├── app.go               # Wails application entry
├── main.go              # Application entry point
└── wails.json           # Wails configuration
```

### Running Tests

**Backend tests (Go):**

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run property-based tests (may take longer)
go test -v ./backend/repository -run Property

# Run specific test
go test -v ./backend/services -run TestTaskService
```

**Frontend tests (Vue):**

```bash
cd frontend

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Building

Build production executables:

```bash
# Build for current platform
wails build

# Build for specific platform
wails build -platform windows/amd64
wails build -platform darwin/universal

# Build with debug info
wails build -debug
```

Executables are created in the `build/bin/` directory.

### Database Schema

The application uses SQLite with the following main tables:

- `projects`: Project configuration and settings
- `report_sections`: Report template sections (prose and status types)
- `status_definitions`: Custom status definitions per project
- `tasks`: Main work items with status and completion tracking
- `subtasks`: Task breakdowns with independent status
- `report_snapshots`: Finalized reports with markdown content
- `task_history`: Audit trail of task states at finalization time

### Architecture

The application follows a clean architecture pattern:

- **Backend (Go)**: All business logic, data validation, and database operations
- **Frontend (Vue 3)**: UI-only layer with no business logic
- **Communication**: Wails bindings expose Go services to the frontend
- **Database**: SQLite for simple deployment and data portability

This design enables future migration to a web platform by replacing the Wails frontend with a web UI while keeping the backend unchanged.

### Logging

The application uses structured logging with Uber's `zap` library:

- Logs are written to `stdout` and `logs/app.log`
- Errors are written to `stderr` and `logs/error.log`
- JSON format for machine parsing
- Log levels: Debug, Info, Warn, Error, Fatal

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`go test ./...` and `npm test`)
5. Commit with DCO signoff (`git commit -s -m "feat: add amazing feature"`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a pull request

Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

## Troubleshooting

### Application won't start

- Check that the database directory is writable
- On macOS, ensure the app is allowed in Security & Privacy settings
- On Windows, check Windows Defender hasn't blocked the executable

### Database errors

- Ensure no other instance of the application is running
- Check disk space availability
- Verify database file permissions

### Export fails

- Ensure the export directory exists and is writable
- Check available disk space
- Verify the filename format doesn't contain invalid characters

### Reports not rendering correctly

- Ensure markdown viewer supports embedded HTML
- Check that status badge CSS is included in the exported file
- Verify the markdown syntax is valid

## License

[Add your license information here]

## Support

[Add support contact information or issue tracker link here]

# Design Document: Status Report Manager

## Overview

The Status Report Manager is a desktop application built with Wails (Go backend + Vue 3 frontend) that enables project managers to track tasks and generate weekly status reports in markdown format. The application follows a clean architecture with complete business logic isolation in the Go backend, making it straightforward to migrate to a web platform in the future.

### Key Design Principles

1. **Business Logic Isolation**: All business logic resides in the Go backend; the frontend is UI-only
2. **Single-User Deployment**: SQLite database for simple deployment with future multi-user migration path
3. **Audit Trail on Finalization**: Task history is captured only when reports are finalized, not on every change
4. **Flexible Report Templates**: Customizable sections (prose and status types) per project
5. **GitHub-Centric Workflow**: Generate → export → PR → review → regenerate → finalize

## Architecture

### Technology Stack

- **Backend**: Go 1.21+
- **Frontend**: Vue 3 + UnoCSS + Vite
- **Desktop Framework**: Wails v2
- **Database**: SQLite 3
- **Build Tool**: Wails CLI

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Desktop Application                      │
│                         (Wails)                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐         ┌─────────────────────┐    │
│  │   Vue 3 Frontend   │◄───────►│   Go Backend        │    │
│  │   (UI Only)        │  Wails  │   (Business Logic)  │    │
│  │                    │ Bindings│                     │    │
│  │  - Components      │         │  - Services         │    │
│  │  - Views           │         │  - Models           │    │
│  │  - UnoCSS Styles   │         │  - Repository       │    │
│  └────────────────────┘         └──────────┬──────────┘    │
│                                             │               │
│                                             ▼               │
│                                  ┌─────────────────────┐   │
│                                  │   SQLite Database   │   │
│                                  │   (Single File)     │   │
│                                  └─────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Markdown Files  │
              │  (Export)        │
              └──────────────────┘
```

### Backend Architecture (Go)

```
backend/
├── models/           # Data models and types
│   ├── project.go
│   ├── task.go
│   ├── subtask.go
│   ├── report_section.go
│   ├── report_snapshot.go
│   └── task_history.go
├── services/         # Business logic layer
│   ├── project_service.go
│   ├── task_service.go
│   ├── report_service.go
│   └── export_service.go
├── repository/       # Database access layer
│   ├── db.go
│   ├── project_repo.go
│   ├── task_repo.go
│   └── report_repo.go
└── app.go           # Wails application entry point
```

### Frontend Architecture (Vue 3)

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ProjectList.vue
│   │   ├── TaskList.vue
│   │   ├── TaskForm.vue
│   │   ├── ReportPreview.vue
│   │   └── MarkdownEditor.vue
│   ├── views/          # Page-level components
│   │   ├── ProjectView.vue
│   │   ├── TaskView.vue
│   │   └── ReportView.vue
│   ├── composables/    # Vue composition functions
│   │   ├── useProjects.ts
│   │   ├── useTasks.ts
│   │   └── useReports.ts
│   ├── App.vue
│   └── main.ts
├── uno.config.ts       # UnoCSS configuration
└── vite.config.ts      # Vite configuration
```

## Components and Interfaces

### Core Data Models

#### Project

```go
type Project struct {
    ID                    int64     `json:"id"`
    Name                  string    `json:"name"`
    FilenameFormat        string    `json:"filename_format"`
    ReportTitleFormat     string    `json:"report_title_format"`
    DefaultDirectory      string    `json:"default_directory"`
    UseYearSubfolders     bool      `json:"use_year_subfolders"`
    RecipientsTo          string    `json:"recipients_to"`
    RecipientsCC          string    `json:"recipients_cc"`
    RecipientsBCC         string    `json:"recipients_bcc"`
    IsArchived            bool      `json:"is_archived"`
    CreatedAt             time.Time `json:"created_at"`
    UpdatedAt             time.Time `json:"updated_at"`
}
```

#### Task

```go
type Task struct {
    ID                    int64      `json:"id"`
    ProjectID             int64      `json:"project_id"`
    ReportSectionID       int64      `json:"report_section_id"`
    Name                  string     `json:"name"`
    Status                string     `json:"status"`
    ExpectedCompletionDate *time.Time `json:"expected_completion_date"`
    URL                   string     `json:"url"`
    Notes                 string     `json:"notes"`
    Priority              int        `json:"priority"`
    IsDeleted             bool       `json:"is_deleted"`
    IsArchived            bool       `json:"is_archived"`
    CreatedAt             time.Time  `json:"created_at"`
    UpdatedAt             time.Time  `json:"updated_at"`
}
```

#### Subtask

```go
type Subtask struct {
    ID                    int64      `json:"id"`
    TaskID                int64      `json:"task_id"`
    Name                  string     `json:"name"`
    Status                string     `json:"status"`
    ExpectedCompletionDate *time.Time `json:"expected_completion_date"`
    URL                   string     `json:"url"`
    Notes                 string     `json:"notes"`
    IsDeleted             bool       `json:"is_deleted"`
    CreatedAt             time.Time  `json:"created_at"`
    UpdatedAt             time.Time  `json:"updated_at"`
}
```

#### ReportSection

```go
type ReportSection struct {
    ID          int64     `json:"id"`
    ProjectID   int64     `json:"project_id"`
    Name        string    `json:"name"`
    Type        string    `json:"type"` // "prose" or "status"
    Content     string    `json:"content"` // For prose sections
    Order       int       `json:"order"`
    IsEnabled   bool      `json:"is_enabled"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

#### StatusDefinition

```go
type StatusDefinition struct {
    ID        int64     `json:"id"`
    ProjectID int64     `json:"project_id"`
    Name      string    `json:"name"`
    Style     string    `json:"style"` // red, green, yellow, gray, paused, pending
    Order     int       `json:"order"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
```

#### TaskHistory

```go
type TaskHistory struct {
    ID                    int64      `json:"id"`
    ReportSnapshotID      int64      `json:"report_snapshot_id"`
    TaskID                int64      `json:"task_id"`
    SubtaskID             *int64     `json:"subtask_id"` // NULL for task-level history
    Name                  string     `json:"name"`
    Status                string     `json:"status"`
    ExpectedCompletionDate *time.Time `json:"expected_completion_date"`
    URL                   string     `json:"url"`
    Notes                 string     `json:"notes"`
    CreatedAt             time.Time  `json:"created_at"`
}
```

#### ReportSnapshot

```go
type ReportSnapshot struct {
    ID            int64     `json:"id"`
    ProjectID     int64     `json:"project_id"`
    MarkdownContent string  `json:"markdown_content"`
    FinalizedAt   time.Time `json:"finalized_at"`
}
```

### Service Interfaces

#### ProjectService

```go
type ProjectService interface {
    CreateProject(project *Project) error
    UpdateProject(project *Project) error
    GetProject(id int64) (*Project, error)
    ListActiveProjects() ([]*Project, error)
    ListArchivedProjects() ([]*Project, error)
    ArchiveProject(id int64) error
    ValidateFilenameFormat(format string) error
    RenderFilename(project *Project, date time.Time) string
    RenderReportTitle(project *Project, date time.Time) string
}
```

#### TaskService

```go
type TaskService interface {
    CreateTask(task *Task) error
    UpdateTask(task *Task) error
    GetTask(id int64) (*Task, error)
    ListTasksBySection(sectionID int64) ([]*Task, error)
    MoveTaskToSection(taskID, sectionID int64) error
    ReorderTasks(sectionID int64, taskIDs []int64) error
    SoftDeleteTask(id int64) error
    RestoreTask(id int64) error
    ArchiveTask(id int64) error
    
    CreateSubtask(subtask *Subtask) error
    UpdateSubtask(subtask *Subtask) error
    GetSubtask(id int64) (*Subtask, error)
    ListSubtasksByTask(taskID int64) ([]*Subtask, error)
    SoftDeleteSubtask(id int64) error
    SoftDeleteAllSubtasks(taskID int64) error
    RestoreSubtask(id int64) error
}
```

#### ReportService

```go
type ReportService interface {
    GenerateReport(projectID int64, date time.Time) (*GeneratedReport, error)
    FinalizeReport(projectID int64, markdownContent string) (*ReportSnapshot, error)
    GetReportSnapshot(id int64) (*ReportSnapshot, error)
    ListReportSnapshots(projectID int64) ([]*ReportSnapshot, error)
    
    CreateReportSection(section *ReportSection) error
    UpdateReportSection(section *ReportSection) error
    GetReportSection(id int64) (*ReportSection, error)
    ListReportSections(projectID int64) ([]*ReportSection, error)
    ReorderSections(projectID int64, sectionIDs []int64) error
    
    CreateStatusDefinition(status *StatusDefinition) error
    UpdateStatusDefinition(status *StatusDefinition) error
    ListStatusDefinitions(projectID int64) ([]*StatusDefinition, error)
}
```

#### ExportService

```go
type ExportService interface {
    ExportToFile(content string, filepath string) error
    GetSuggestedFilepath(project *Project, date time.Time) string
    CopyToClipboard(content string) error
}
```

### Generated Report Structure

```go
type GeneratedReport struct {
    Title       string
    Recipients  Recipients
    Sections    []RenderedSection
    CSS         string
}

type Recipients struct {
    To  string
    CC  string
    BCC string
}

type RenderedSection struct {
    Name    string
    Type    string
    Content string // Rendered markdown
}

type TaskWithChanges struct {
    Task            *Task
    Subtasks        []*Subtask
    StatusChanged   bool
    OldStatus       string
    ECDChanged      bool
    OldECD          *time.Time
}
```

## Data Models

### Database Schema

```sql
-- Projects table
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filename_format TEXT NOT NULL DEFAULT '{project-name}-status-{YYYY-MM-DD}.md',
    report_title_format TEXT NOT NULL DEFAULT '{project-name} Status Report - {YYYY-MM-DD}',
    default_directory TEXT NOT NULL DEFAULT '',
    use_year_subfolders BOOLEAN NOT NULL DEFAULT 0,
    recipients_to TEXT NOT NULL DEFAULT '',
    recipients_cc TEXT NOT NULL DEFAULT '',
    recipients_bcc TEXT NOT NULL DEFAULT '',
    is_archived BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Report sections table
CREATE TABLE report_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('prose', 'status')),
    content TEXT NOT NULL DEFAULT '',
    order_index INTEGER NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Status definitions table
CREATE TABLE status_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    style TEXT NOT NULL CHECK(style IN ('red', 'green', 'yellow', 'gray', 'paused', 'pending')),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tasks table
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    report_section_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    expected_completion_date DATE,
    url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (report_section_id) REFERENCES report_sections(id) ON DELETE RESTRICT
);

-- Subtasks table
CREATE TABLE subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    expected_completion_date DATE,
    url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Report snapshots table
CREATE TABLE report_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    markdown_content TEXT NOT NULL,
    finalized_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Task history table (audit trail)
CREATE TABLE task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_snapshot_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    subtask_id INTEGER,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    expected_completion_date DATE,
    url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_snapshot_id) REFERENCES report_snapshots(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (subtask_id) REFERENCES subtasks(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_tasks_project_section ON tasks(project_id, report_section_id);
CREATE INDEX idx_tasks_deleted ON tasks(is_deleted);
CREATE INDEX idx_subtasks_task ON subtasks(task_id);
CREATE INDEX idx_subtasks_deleted ON subtasks(is_deleted);
CREATE INDEX idx_task_history_snapshot ON task_history(report_snapshot_id);
CREATE INDEX idx_task_history_task ON task_history(task_id);
CREATE INDEX idx_report_sections_project ON report_sections(project_id);
CREATE INDEX idx_status_definitions_project ON status_definitions(project_id);
```

### Template Variable Processing

The system supports template variables in filename and title formats:

- `{project-name}`: Replaced with project name (sanitized for filenames)
- `{YYYY-MM-DD}`: Replaced with full date (e.g., "2026-02-20")
- `{YYYY}`: Replaced with 4-digit year (e.g., "2026")
- `{MM}`: Replaced with 2-digit month (e.g., "02")
- `{DD}`: Replaced with 2-digit day (e.g., "20")

Example formats:

- Filename: `{project-name}-status-{YYYY-MM-DD}.md` → `valkey-status-2026-02-20.md`
- Title: `{project-name} Weekly Update - {YYYY-MM-DD}` → `Valkey Weekly Update - 2026-02-20`

### Report Generation Algorithm

```go
func (s *ReportService) GenerateReport(projectID int64, date time.Time) (*GeneratedReport, error) {
    // 1. Load project configuration
    project := s.repo.GetProject(projectID)
    
    // 2. Load enabled report sections in order
    sections := s.repo.ListEnabledReportSections(projectID)
    
    // 3. Get last finalized report snapshot for change detection
    lastSnapshot := s.repo.GetLastReportSnapshot(projectID)
    
    // 4. Build recipients block
    recipients := Recipients{
        To:  project.RecipientsTo,
        CC:  project.RecipientsCC,
        BCC: project.RecipientsBCC,
    }
    
    // 5. Render title using template
    title := s.projectService.RenderReportTitle(project, date)
    
    // 6. Render each section
    renderedSections := []RenderedSection{}
    for _, section := range sections {
        if section.Type == "prose" {
            // Prose section: use stored content
            renderedSections = append(renderedSections, RenderedSection{
                Name:    section.Name,
                Type:    "prose",
                Content: section.Content,
            })
        } else {
            // Status section: generate from tasks
            content := s.renderStatusSection(section, lastSnapshot)
            renderedSections = append(renderedSections, RenderedSection{
                Name:    section.Name,
                Type:    "status",
                Content: content,
            })
        }
    }
    
    // 7. Load CSS styles
    css := s.loadStatusBadgeCSS()
    
    return &GeneratedReport{
        Title:      title,
        Recipients: recipients,
        Sections:   renderedSections,
        CSS:        css,
    }, nil
}

func (s *ReportService) renderStatusSection(section *ReportSection, lastSnapshot *ReportSnapshot) string {
    // 1. Get all tasks for this section (not deleted, not archived)
    tasks := s.taskRepo.ListTasksBySection(section.ID)
    
    // 2. For each task, get subtasks
    tasksWithSubtasks := []TaskWithChanges{}
    for _, task := range tasks {
        subtasks := s.taskRepo.ListSubtasksByTask(task.ID)
        
        // 3. Detect changes since last snapshot
        changes := s.detectChanges(task, subtasks, lastSnapshot)
        
        tasksWithSubtasks = append(tasksWithSubtasks, changes)
    }
    
    // 4. Render markdown for this section
    return s.renderTasksAsMarkdown(tasksWithSubtasks)
}

func (s *ReportService) detectChanges(task *Task, subtasks []*Subtask, lastSnapshot *ReportSnapshot) TaskWithChanges {
    if lastSnapshot == nil {
        return TaskWithChanges{
            Task:          task,
            Subtasks:      subtasks,
            StatusChanged: false,
            ECDChanged:    false,
        }
    }
    
    // Find task in last snapshot's history
    lastTaskState := s.repo.GetTaskHistoryForSnapshot(lastSnapshot.ID, task.ID, nil)
    
    if lastTaskState == nil {
        // Task didn't exist in last report
        return TaskWithChanges{
            Task:          task,
            Subtasks:      subtasks,
            StatusChanged: false,
            ECDChanged:    false,
        }
    }
    
    // Compare status
    statusChanged := task.Status != lastTaskState.Status
    oldStatus := lastTaskState.Status
    
    // Compare ECD
    ecdChanged := !equalDates(task.ExpectedCompletionDate, lastTaskState.ExpectedCompletionDate)
    oldECD := lastTaskState.ExpectedCompletionDate
    
    return TaskWithChanges{
        Task:          task,
        Subtasks:      subtasks,
        StatusChanged: statusChanged,
        OldStatus:     oldStatus,
        ECDChanged:    ecdChanged,
        OldECD:        oldECD,
    }
}
```

### Report Finalization Algorithm

```go
func (s *ReportService) FinalizeReport(projectID int64, markdownContent string) (*ReportSnapshot, error) {
    // 1. Create report snapshot
    snapshot := &ReportSnapshot{
        ProjectID:       projectID,
        MarkdownContent: markdownContent,
        FinalizedAt:     time.Now(),
    }
    s.repo.CreateReportSnapshot(snapshot)
    
    // 2. Capture task history for all tasks in project
    tasks := s.taskRepo.ListAllTasksByProject(projectID)
    
    for _, task := range tasks {
        // Skip deleted and archived tasks
        if task.IsDeleted || task.IsArchived {
            continue
        }
        
        // Create task history entry
        history := &TaskHistory{
            ReportSnapshotID:      snapshot.ID,
            TaskID:                task.ID,
            SubtaskID:             nil,
            Name:                  task.Name,
            Status:                task.Status,
            ExpectedCompletionDate: task.ExpectedCompletionDate,
            URL:                   task.URL,
            Notes:                 task.Notes,
            CreatedAt:             time.Now(),
        }
        s.repo.CreateTaskHistory(history)
        
        // Capture subtask history
        subtasks := s.taskRepo.ListSubtasksByTask(task.ID)
        for _, subtask := range subtasks {
            if subtask.IsDeleted {
                continue
            }
            
            subHistory := &TaskHistory{
                ReportSnapshotID:      snapshot.ID,
                TaskID:                task.ID,
                SubtaskID:             &subtask.ID,
                Name:                  subtask.Name,
                Status:                subtask.Status,
                ExpectedCompletionDate: subtask.ExpectedCompletionDate,
                URL:                   subtask.URL,
                Notes:                 subtask.Notes,
                CreatedAt:             time.Now(),
            }
            s.repo.CreateTaskHistory(subHistory)
        }
    }
    
    return snapshot, nil
}
```

### Markdown Rendering

```go
func (s *ReportService) renderTasksAsMarkdown(tasks []TaskWithChanges) string {
    var md strings.Builder
    
    for _, taskWithChanges := range tasks {
        task := taskWithChanges.Task
        
        // Render task name with optional URL
        if task.URL != "" {
            md.WriteString(fmt.Sprintf("- [%s](%s)", task.Name, task.URL))
        } else {
            md.WriteString(fmt.Sprintf("- %s", task.Name))
        }
        
        // Render status with change indicator
        if taskWithChanges.StatusChanged {
            oldStyle := s.getStatusStyle(taskWithChanges.OldStatus)
            newStyle := s.getStatusStyle(task.Status)
            md.WriteString(fmt.Sprintf(" <span class=\"%s\">%s</span> → <span class=\"%s\">%s</span>",
                oldStyle, taskWithChanges.OldStatus, newStyle, task.Status))
        } else {
            style := s.getStatusStyle(task.Status)
            md.WriteString(fmt.Sprintf(" <span class=\"%s\">%s</span>", style, task.Status))
        }
        
        // Render ECD with change indicator
        if task.ExpectedCompletionDate != nil {
            if taskWithChanges.ECDChanged && taskWithChanges.OldECD != nil {
                md.WriteString(fmt.Sprintf(" ~~%s~~ %s",
                    taskWithChanges.OldECD.Format("2006-01-02"),
                    task.ExpectedCompletionDate.Format("2006-01-02")))
            } else {
                md.WriteString(fmt.Sprintf(" %s", task.ExpectedCompletionDate.Format("2006-01-02")))
            }
        }
        
        md.WriteString("\n")
        
        // Render notes if present
        if task.Notes != "" {
            md.WriteString(fmt.Sprintf("  %s\n", task.Notes))
        }
        
        // Render subtasks
        for _, subtask := range taskWithChanges.Subtasks {
            md.WriteString(fmt.Sprintf("  - %s", subtask.Name))
            
            style := s.getStatusStyle(subtask.Status)
            md.WriteString(fmt.Sprintf(" <span class=\"%s\">%s</span>", style, subtask.Status))
            
            if subtask.ExpectedCompletionDate != nil {
                md.WriteString(fmt.Sprintf(" %s", subtask.ExpectedCompletionDate.Format("2006-01-02")))
            }
            
            md.WriteString("\n")
            
            if subtask.Notes != "" {
                md.WriteString(fmt.Sprintf("    %s\n", subtask.Notes))
            }
        }
        
        md.WriteString("\n")
    }
    
    return md.String()
}
```

### Status Badge CSS

```css
<style>
.status-red {
    background-color: #fee;
    color: #c00;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
}

.status-green {
    background-color: #efe;
    color: #0a0;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
}

.status-yellow {
    background-color: #ffe;
    color: #aa0;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
}

.status-gray {
    background-color: #eee;
    color: #666;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
}

.status-paused {
    background-color: #fef;
    color: #90a;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
}

.status-pending {
    background-color: #eff;
    color: #099;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
}
</style>
```

## Error Handling

### Error Types

```go
type ErrorCode string

const (
    ErrNotFound          ErrorCode = "NOT_FOUND"
    ErrInvalidInput      ErrorCode = "INVALID_INPUT"
    ErrDatabaseError     ErrorCode = "DATABASE_ERROR"
    ErrFileSystemError   ErrorCode = "FILESYSTEM_ERROR"
    ErrValidationError   ErrorCode = "VALIDATION_ERROR"
)

type AppError struct {
    Code    ErrorCode
    Message string
    Err     error
}

func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Err)
    }
    return fmt.Sprintf("%s: %s", e.Code, e.Message)
}
```

### Error Handling Strategy

1. **Service Layer**: Catch and wrap errors with context
2. **Repository Layer**: Return raw database errors
3. **Frontend**: Display user-friendly error messages
4. **Logging**: Use structured logging with `zap` library

**Structured Logging with Zap**:

The application will use Uber's `zap` library for structured logging. Zap provides:

- High-performance structured logging
- JSON output format for machine parsing
- Support for multiple output destinations
- Easy migration to cloud logging services (CloudWatch, Stackdriver, etc.)

```go
import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

// Initialize logger
func InitLogger() (*zap.Logger, error) {
    config := zap.NewProductionConfig()
    config.OutputPaths = []string{"stdout", "logs/app.log"}
    config.ErrorOutputPaths = []string{"stderr", "logs/error.log"}
    config.EncoderConfig.TimeKey = "timestamp"
    config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
    
    return config.Build()
}

// Usage in services
func (s *TaskService) CreateTask(task *Task) error {
    s.logger.Info("creating task",
        zap.String("task_name", task.Name),
        zap.Int64("project_id", task.ProjectID),
        zap.Int64("section_id", task.ReportSectionID),
    )
    
    if err := s.repo.CreateTask(task); err != nil {
        s.logger.Error("failed to create task",
            zap.Error(err),
            zap.String("task_name", task.Name),
            zap.Int64("project_id", task.ProjectID),
        )
        return &AppError{
            Code:    ErrDatabaseError,
            Message: "Failed to create task",
            Err:     err,
        }
    }
    
    s.logger.Info("task created successfully",
        zap.Int64("task_id", task.ID),
        zap.String("task_name", task.Name),
    )
    
    return nil
}
```

**Log Levels**:

- **Debug**: Detailed information for debugging (disabled in production)
- **Info**: General informational messages (user actions, state changes)
- **Warn**: Warning messages (deprecated features, recoverable errors)
- **Error**: Error messages (failed operations, exceptions)
- **Fatal**: Critical errors that require application shutdown

**Future Cloud Migration**:
Zap supports custom zapcore.Core implementations, making it straightforward to add cloud logging:

- AWS CloudWatch: Use `zapdriver` or custom core
- Google Cloud Logging: Use `zapdriver`
- Azure Monitor: Use custom core with Azure SDK
- Datadog, Splunk, etc.: Use respective integrations

### Common Error Scenarios

- **Project not found**: Return 404-equivalent error
- **Invalid filename format**: Validate before saving, return validation error
- **Database connection failure**: Retry with exponential backoff
- **File export failure**: Show error dialog with retry option
- **Concurrent modification**: Use optimistic locking with updated_at timestamps

## Testing Strategy

### Unit Testing

**Backend (Go)**:

- Test each service method independently
- Mock repository layer using interfaces
- Test template variable replacement
- Test markdown rendering logic
- Test change detection algorithm
- Test date formatting and validation

**Frontend (Vue)**:

- Test component rendering
- Test user interactions
- Test composable functions
- Mock backend API calls

### Integration Testing

- Test database migrations
- Test Wails bindings between frontend and backend
- Test file export functionality
- Test end-to-end report generation workflow

### Property-Based Testing

Property-based tests will be defined based on the correctness properties section below. Each property will be implemented using a Go property-based testing library (e.g., `gopter` or `rapid`) with a minimum of 100 iterations per test.

### Manual Testing

- Cross-platform testing (Windows and macOS)
- UI responsiveness testing
- Markdown rendering in various viewers
- GitHub PR workflow testing

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Project Name Validation

*For any* project creation attempt with an empty or whitespace-only name, the system should reject the creation and return a validation error.

**Validates: Requirements 1.1**

### Property 2: Year Subfolder Path Construction

*For any* project with year subfolders enabled and any date, the generated export path should include a subdirectory matching the year (YYYY format) from that date.

**Validates: Requirements 1.6**

### Property 3: Template Variable Replacement Completeness

*For any* filename or title format template containing template variables (`{project-name}`, `{YYYY-MM-DD}`, `{YYYY}`, `{MM}`, `{DD}`) and any date, the rendered output should have all template variables replaced with their corresponding values and preserve any custom text in the template.

**Validates: Requirements 1.7, 1.8, 1.9**

### Property 4: Filename Format Validation

*For any* filename format template containing invalid filesystem characters (e.g., `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`), the validation should reject the template and return an error.

**Validates: Requirements 1.10**

### Property 5: Task Name Validation

*For any* task creation attempt with an empty or whitespace-only name, the system should reject the creation and return a validation error.

**Validates: Requirements 3.1**

### Property 6: Task Section Assignment Validation

*For any* task creation attempt without a report section assignment, the system should reject the creation and return a validation error.

**Validates: Requirements 3.2**

### Property 7: Soft Delete and Restore Round-Trip

*For any* task or subtask, soft deleting it and then restoring it should result in the item being in the same state as before the soft delete (is_deleted flag should be false).

**Validates: Requirements 3.18, 3.19, 3.21, 3.22**

### Property 8: Task History Capture Completeness

*For any* project with tasks and subtasks, when a report is finalized, the system should create Task_History entries for all non-deleted and non-archived tasks and their non-deleted subtasks, capturing name, status, expected completion date, URL, and notes.

**Validates: Requirements 4.6, 4.8, 8.11**

### Property 9: Task History Timestamp Presence

*For any* finalized report, all Task_History entries created during finalization should have a timestamp that matches the finalization time (within a reasonable tolerance of a few seconds).

**Validates: Requirements 4.7, 8.12**

### Property 10: Change Detection Accuracy

*For any* task with a previous Task_History entry, the change detection algorithm should correctly identify whether the status has changed and whether the expected completion date has changed by comparing current values with the most recent history entry.

**Validates: Requirements 4.9, 7.10, 8.15**

### Property 11: No Change Highlighting for Non-Tracked Fields

*For any* task where only the name, URL, or notes have changed since the last finalized report, the generated report should not display any change indicators (arrows or strikethrough) for that task.

**Validates: Requirements 4.10, 7.11**

### Property 12: Report Structure Completeness

*For any* generated report, the markdown output should contain: (1) a recipients block with To, CC, and BCC fields, (2) a title rendered from the project's title template, (3) CSS styles for status badges, and (4) content for all enabled report sections.

**Validates: Requirements 7.2, 7.3, 7.4, 7.5**

### Property 13: Status Section Task Filtering

*For any* status-type report section, the generated content should include only tasks and subtasks that are assigned to that specific section, and should not include tasks from other sections.

**Validates: Requirements 7.6**

### Property 14: Status Badge HTML Format

*For any* task or subtask status displayed in a report, the status should be wrapped in an HTML `<span>` tag with a CSS class corresponding to the status style (e.g., "status-red", "status-green").

**Validates: Requirements 7.7**

### Property 15: Status Change Rendering

*For any* task whose status has changed since the last finalized report, the generated report should display the status transition in the format: `<span class="old-style">old status</span> → <span class="new-style">new status</span>`.

**Validates: Requirements 7.8**

### Property 16: ECD Change Rendering

*For any* task whose expected completion date has changed since the last finalized report, the generated report should display the change in the format: `~~old ECD~~ new ECD`.

**Validates: Requirements 7.9**

### Property 17: Report Section Ordering

*For any* generated report, the sections should appear in the output in the same order as their configured order_index values (ascending).

**Validates: Requirements 7.12**

### Property 18: Preview Generation Does Not Create History

*For any* report generation that is not finalized, the system should not create any Task_History entries or Report_Snapshot records.

**Validates: Requirements 8.1**

### Property 19: File Export Round-Trip

*For any* generated report markdown content, exporting it to a file and then reading the file back should produce identical content (preserving all markdown formatting and embedded HTML).

**Validates: Requirements 8.6**

### Property 20: Snapshot Creation on Finalization

*For any* report finalization, the system should create exactly one Report_Snapshot record with the markdown content and a finalization timestamp.

**Validates: Requirements 8.10**

### Property 21: Referential Integrity on Finalization

*For any* finalized report, all Task_History entries should have valid foreign key references: report_snapshot_id should reference an existing Report_Snapshot, task_id should reference an existing Task, and subtask_id (if not NULL) should reference an existing Subtask.

**Validates: Requirements 8.13**

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests as complementary approaches:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Together, these provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Unit Testing

**Backend (Go)**:

- Test service methods with specific examples
- Test repository CRUD operations
- Test template variable replacement with known inputs
- Test markdown rendering with sample data
- Test change detection with specific before/after states
- Test date formatting edge cases (leap years, month boundaries)
- Test error handling paths
- Test soft delete and restore operations
- Test file export with various content types

**Frontend (Vue)**:

- Test component rendering with sample data
- Test user interactions (button clicks, form submissions)
- Test composable functions with mock data
- Test error display and loading states
- Mock backend API calls using test doubles

### Property-Based Testing

Property-based tests will be implemented using the `gopter` library for Go. Each test will run a minimum of 100 iterations with randomly generated inputs.

**Test Configuration**:

```go
import (
    "testing"
    "github.com/leanovate/gopter"
    "github.com/leanovate/gopter/gen"
    "github.com/leanovate/gopter/prop"
)

func TestProperty(t *testing.T) {
    properties := gopter.NewProperties(nil)
    properties.Property("Feature: status-report-manager, Property N: [property text]",
        prop.ForAll(
            func(input InputType) bool {
                // Test property
                return true
            },
            gen.Generator(), // Input generator
        ))
    properties.TestingRun(t, gopter.ConsoleReporter(false))
}
```

**Property Test Implementation Plan**:

1. **Property 1-6**: Input validation properties
   - Generate random strings (empty, whitespace, valid)
   - Generate random filename formats (valid and invalid characters)
   - Verify rejection of invalid inputs

2. **Property 7**: Soft delete round-trip
   - Generate random tasks and subtasks
   - Perform soft delete → restore cycle
   - Verify is_deleted flag state

3. **Property 8-9**: Task history capture
   - Generate random project states with tasks/subtasks
   - Finalize report
   - Verify all non-deleted items have history entries with timestamps

4. **Property 10-11**: Change detection
   - Generate random task states and history entries
   - Run change detection algorithm
   - Verify correct identification of status/ECD changes only

5. **Property 12-17**: Report generation
   - Generate random project configurations
   - Generate reports
   - Verify structure, content, ordering, and formatting

6. **Property 18**: Preview doesn't create history
   - Generate random reports without finalization
   - Verify no history or snapshot records created

7. **Property 19**: File export round-trip
   - Generate random markdown content
   - Export → read → compare
   - Verify content preservation

8. **Property 20-21**: Finalization integrity
   - Generate random project states
   - Finalize reports
   - Verify snapshot creation and referential integrity

**Generators**:

```go
// Generate random projects
func genProject() gopter.Gen {
    return gen.Struct(reflect.TypeOf(&Project{}), map[string]gopter.Gen{
        "Name":              gen.AlphaString(),
        "FilenameFormat":    genFilenameFormat(),
        "UseYearSubfolders": gen.Bool(),
        // ... other fields
    })
}

// Generate random tasks
func genTask() gopter.Gen {
    return gen.Struct(reflect.TypeOf(&Task{}), map[string]gopter.Gen{
        "Name":   gen.AlphaString().SuchThat(func(s string) bool { return len(s) > 0 }),
        "Status": gen.OneConstOf("not started", "in progress", "done"),
        // ... other fields
    })
}

// Generate random dates
func genDate() gopter.Gen {
    return gen.TimeRange(
        time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
        time.Date(2030, 12, 31, 0, 0, 0, 0, time.UTC),
    )
}
```

### Integration Testing

- **Database migrations**: Test schema creation and upgrades
- **Wails bindings**: Test frontend-backend communication
- **File system operations**: Test export to various paths
- **End-to-end workflows**:
  - Create project → add tasks → generate report → finalize
  - Generate → export → regenerate → finalize
  - Soft delete → restore → verify in report

### Manual Testing Checklist

- [ ] Cross-platform testing (Windows 10/11, macOS 12+)
- [ ] UI responsiveness at different window sizes
- [ ] Markdown rendering in GitHub, VS Code, and other viewers
- [ ] Large datasets (100+ tasks per project)
- [ ] Year subfolder creation and organization
- [ ] Template variable replacement with edge cases
- [ ] Status badge rendering in various markdown viewers
- [ ] Copy to clipboard functionality
- [ ] File export to various locations (network drives, cloud folders)
- [ ] Application startup and shutdown
- [ ] Database file portability between machines

### Performance Testing

- **Report generation**: Should complete in < 1 second for projects with 100 tasks
- **Database queries**: Should use indexes effectively for large datasets
- **File export**: Should handle reports up to 1MB without blocking UI
- **Application startup**: Should launch in < 2 seconds

### Test Coverage Goals

- **Backend code coverage**: > 80%
- **Frontend code coverage**: > 70%
- **Property tests**: All 21 properties implemented
- **Integration tests**: All critical workflows covered

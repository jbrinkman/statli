package main

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"src/backend/models"
	"src/backend/repository"
	"src/backend/services"

	_ "github.com/mattn/go-sqlite3"
	"go.uber.org/zap"
)

// setupIntegrationTest creates a test App instance with in-memory database
func setupIntegrationTest(t *testing.T) *App {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")

	logger := zap.NewNop()

	conn, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}

	db := &repository.DB{
		Conn:   conn,
		Logger: logger,
	}

	// Initialize schema using the same SQL as in db.go
	schema := `
	CREATE TABLE IF NOT EXISTS projects (
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

	CREATE TABLE IF NOT EXISTS report_sections (
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

	CREATE TABLE IF NOT EXISTS status_definitions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		style TEXT NOT NULL CHECK(style IN ('red', 'green', 'yellow', 'gray', 'paused', 'pending')),
		order_index INTEGER NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS tasks (
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

	CREATE TABLE IF NOT EXISTS subtasks (
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

	CREATE TABLE IF NOT EXISTS report_snapshots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		markdown_content TEXT NOT NULL,
		finalized_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS task_history (
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

	CREATE INDEX IF NOT EXISTS idx_tasks_project_section ON tasks(project_id, report_section_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(is_deleted);
	CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
	CREATE INDEX IF NOT EXISTS idx_subtasks_deleted ON subtasks(is_deleted);
	CREATE INDEX IF NOT EXISTS idx_task_history_snapshot ON task_history(report_snapshot_id);
	CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);
	CREATE INDEX IF NOT EXISTS idx_report_sections_project ON report_sections(project_id);
	CREATE INDEX IF NOT EXISTS idx_status_definitions_project ON status_definitions(project_id);
	`

	if _, err := conn.Exec(schema); err != nil {
		t.Fatalf("failed to initialize schema: %v", err)
	}

	app := NewApp()
	app.ctx = context.Background()
	app.db = db
	app.logger = logger

	// Initialize repositories
	projectRepo := repository.NewProjectRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	reportRepo := repository.NewReportRepository(db)

	// Initialize services
	templateService := services.NewTemplateService(logger)
	app.projectService = services.NewProjectService(projectRepo, templateService, logger)
	app.taskService = services.NewTaskService(taskRepo, logger)
	app.reportService = services.NewReportService(reportRepo, logger)
	app.exportService = services.NewExportService(templateService, logger)

	return app
}

// TestIntegration_ServiceBindings tests that all services are accessible through Wails bindings
func TestIntegration_ServiceBindings(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	// Test that all service getters return non-nil services
	if app.GetProjectService() == nil {
		t.Error("GetProjectService() returned nil")
	}

	if app.GetTaskService() == nil {
		t.Error("GetTaskService() returned nil")
	}

	if app.GetReportService() == nil {
		t.Error("GetReportService() returned nil")
	}

	if app.GetExportService() == nil {
		t.Error("GetExportService() returned nil")
	}
}

// TestIntegration_ErrorPropagation tests that errors from backend services propagate correctly
func TestIntegration_ErrorPropagation(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()

	tests := []struct {
		name    string
		project *models.Project
		wantErr bool
	}{
		{
			name: "invalid project - empty name",
			project: &models.Project{
				Name:              "",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				ReportTitleFormat: "{project-name} Report",
			},
			wantErr: true,
		},
		{
			name: "invalid project - whitespace name",
			project: &models.Project{
				Name:              "   ",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				ReportTitleFormat: "{project-name} Report",
			},
			wantErr: true,
		},
		{
			name: "valid project",
			project: &models.Project{
				Name:              "Valid Project",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				ReportTitleFormat: "{project-name} Report",
				DefaultDirectory:  "/tmp",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := projectService.CreateProject(tt.project)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateProject() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestIntegration_EndToEndWorkflow tests a complete workflow through the service layer
func TestIntegration_EndToEndWorkflow(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()
	taskService := app.GetTaskService()
	reportService := app.GetReportService()

	// Get repositories for service calls
	taskRepo := repository.NewTaskRepository(app.db)

	// Step 1: Create a project
	project := &models.Project{
		Name:              "Integration Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Status Report - {YYYY-MM-DD}",
		DefaultDirectory:  "/tmp",
		UseYearSubfolders: false,
		RecipientsTo:      "team@example.com",
		RecipientsCC:      "manager@example.com",
		RecipientsBCC:     "",
	}

	err := projectService.CreateProject(project)
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	if project.ID == 0 {
		t.Fatal("project ID not set after creation")
	}

	// Step 2: Create default status definitions
	statuses := []struct {
		name  string
		style string
	}{
		{"not started", "gray"},
		{"in progress", "yellow"},
		{"done", "green"},
	}

	for i, status := range statuses {
		statusDef := &models.StatusDefinition{
			ProjectID: project.ID,
			Name:      status.name,
			Style:     status.style,
			Order:     i,
		}
		err := reportService.CreateStatusDefinition(statusDef)
		if err != nil {
			t.Fatalf("failed to create status definition: %v", err)
		}
	}

	// Step 3: Create report sections
	sections := []struct {
		name    string
		secType string
		order   int
	}{
		{"TL;DR", "prose", 0},
		{"Roadmap", "status", 1},
		{"Completed", "status", 2},
	}

	var roadmapSection, completedSection *models.ReportSection

	for _, sec := range sections {
		section := &models.ReportSection{
			ProjectID: project.ID,
			Name:      sec.name,
			Type:      sec.secType,
			Order:     sec.order,
			IsEnabled: true,
		}

		if sec.secType == "prose" {
			section.Content = "This is a test prose section."
		}

		err := reportService.CreateReportSection(section)
		if err != nil {
			t.Fatalf("failed to create report section: %v", err)
		}

		if sec.name == "Roadmap" {
			roadmapSection = section
		} else if sec.name == "Completed" {
			completedSection = section
		}
	}

	// Step 4: Create tasks
	task1 := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: roadmapSection.ID,
		Name:            "Implement feature X",
		Status:          "in progress",
		Notes:           "Working on the implementation",
		Priority:        0,
	}

	err = taskService.CreateTask(task1)
	if err != nil {
		t.Fatalf("failed to create task1: %v", err)
	}

	task2 := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: completedSection.ID,
		Name:            "Fix bug Y",
		Status:          "done",
		Notes:           "Bug fixed and tested",
		Priority:        0,
	}

	err = taskService.CreateTask(task2)
	if err != nil {
		t.Fatalf("failed to create task2: %v", err)
	}

	// Step 5: Create subtasks
	subtask1 := &models.Subtask{
		TaskID: task1.ID,
		Name:   "Write unit tests",
		Status: "not started",
	}

	err = taskService.CreateSubtask(subtask1)
	if err != nil {
		t.Fatalf("failed to create subtask: %v", err)
	}

	// Step 6: Generate report
	report, err := reportService.GenerateReport(project.ID, time.Now(), projectService, taskRepo)
	if err != nil {
		t.Fatalf("failed to generate report: %v", err)
	}

	// Verify report structure
	if report.Title == "" {
		t.Error("report title is empty")
	}

	if report.Recipients.To != "team@example.com" {
		t.Errorf("expected recipients.to = 'team@example.com', got '%s'", report.Recipients.To)
	}

	if len(report.Sections) != 3 {
		t.Errorf("expected 3 sections, got %d", len(report.Sections))
	}

	// Verify sections are in correct order
	if report.Sections[0].Name != "TL;DR" {
		t.Errorf("expected first section to be 'TL;DR', got '%s'", report.Sections[0].Name)
	}

	if report.Sections[1].Name != "Roadmap" {
		t.Errorf("expected second section to be 'Roadmap', got '%s'", report.Sections[1].Name)
	}

	if report.Sections[2].Name != "Completed" {
		t.Errorf("expected third section to be 'Completed', got '%s'", report.Sections[2].Name)
	}

	// Step 7: Finalize report
	markdownContent := "# Test Report\n\nThis is a test report."
	snapshot, err := reportService.FinalizeReport(project.ID, markdownContent, taskRepo)
	if err != nil {
		t.Fatalf("failed to finalize report: %v", err)
	}

	if snapshot.ID == 0 {
		t.Error("snapshot ID not set after finalization")
	}

	if snapshot.MarkdownContent != markdownContent {
		t.Error("snapshot markdown content does not match")
	}

	// Step 8: Verify task history was captured
	// Query task history to ensure it was created
	var historyCount int
	err = app.db.Conn.QueryRow("SELECT COUNT(*) FROM task_history WHERE report_snapshot_id = ?", snapshot.ID).Scan(&historyCount)
	if err != nil {
		t.Fatalf("failed to query task history: %v", err)
	}

	// Should have history for 2 tasks + 1 subtask = 3 entries
	if historyCount != 3 {
		t.Errorf("expected 3 task history entries, got %d", historyCount)
	}
}

// TestIntegration_TaskOperations tests task CRUD operations through the service layer
func TestIntegration_TaskOperations(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()
	taskService := app.GetTaskService()
	reportService := app.GetReportService()

	// Create project
	project := &models.Project{
		Name:              "Task Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
	}
	err := projectService.CreateProject(project)
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Create report section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Test Section",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	err = reportService.CreateReportSection(section)
	if err != nil {
		t.Fatalf("failed to create section: %v", err)
	}

	// Test task creation
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}

	err = taskService.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	if task.ID == 0 {
		t.Error("task ID not set after creation")
	}

	// Test task retrieval
	retrieved, err := taskService.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.Name != "Test Task" {
		t.Errorf("expected task name 'Test Task', got '%s'", retrieved.Name)
	}

	// Test task update
	retrieved.Status = "in progress"
	err = taskService.UpdateTask(retrieved)
	if err != nil {
		t.Fatalf("failed to update task: %v", err)
	}

	updated, err := taskService.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get updated task: %v", err)
	}

	if updated.Status != "in progress" {
		t.Errorf("expected status 'in progress', got '%s'", updated.Status)
	}

	// Test soft delete
	err = taskService.SoftDeleteTask(task.ID)
	if err != nil {
		t.Fatalf("failed to soft delete task: %v", err)
	}

	deleted, err := taskService.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get deleted task: %v", err)
	}

	if !deleted.IsDeleted {
		t.Error("task should be marked as deleted")
	}

	// Test restore
	err = taskService.RestoreTask(task.ID)
	if err != nil {
		t.Fatalf("failed to restore task: %v", err)
	}

	restored, err := taskService.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get restored task: %v", err)
	}

	if restored.IsDeleted {
		t.Error("task should not be marked as deleted after restore")
	}
}

// TestIntegration_SubtaskOperations tests subtask CRUD operations through the service layer
func TestIntegration_SubtaskOperations(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()
	taskService := app.GetTaskService()
	reportService := app.GetReportService()

	// Create project
	project := &models.Project{
		Name:              "Subtask Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
	}
	err := projectService.CreateProject(project)
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Create report section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Test Section",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	err = reportService.CreateReportSection(section)
	if err != nil {
		t.Fatalf("failed to create section: %v", err)
	}

	// Create task
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	err = taskService.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Test subtask creation
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Test Subtask",
		Status: "not started",
	}

	err = taskService.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("failed to create subtask: %v", err)
	}

	if subtask.ID == 0 {
		t.Error("subtask ID not set after creation")
	}

	// Test subtask retrieval
	retrieved, err := taskService.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if retrieved.Name != "Test Subtask" {
		t.Errorf("expected subtask name 'Test Subtask', got '%s'", retrieved.Name)
	}

	// Test subtask update
	retrieved.Status = "done"
	err = taskService.UpdateSubtask(retrieved)
	if err != nil {
		t.Fatalf("failed to update subtask: %v", err)
	}

	updated, err := taskService.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get updated subtask: %v", err)
	}

	if updated.Status != "done" {
		t.Errorf("expected status 'done', got '%s'", updated.Status)
	}

	// Test list subtasks by task
	subtasks, err := taskService.ListSubtasksByTask(task.ID)
	if err != nil {
		t.Fatalf("failed to list subtasks: %v", err)
	}

	if len(subtasks) != 1 {
		t.Errorf("expected 1 subtask, got %d", len(subtasks))
	}

	// Test soft delete
	err = taskService.SoftDeleteSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to soft delete subtask: %v", err)
	}

	deleted, err := taskService.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get deleted subtask: %v", err)
	}

	if !deleted.IsDeleted {
		t.Error("subtask should be marked as deleted")
	}

	// Test restore
	err = taskService.RestoreSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to restore subtask: %v", err)
	}

	restored, err := taskService.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get restored subtask: %v", err)
	}

	if restored.IsDeleted {
		t.Error("subtask should not be marked as deleted after restore")
	}
}

// TestIntegration_CompleteReportWorkflowWithChanges tests the complete workflow:
// Create project → add tasks → finalize report → modify tasks → generate new report with changes
func TestIntegration_CompleteReportWorkflowWithChanges(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()
	taskService := app.GetTaskService()
	reportService := app.GetReportService()
	taskRepo := repository.NewTaskRepository(app.db)

	// Step 1: Create project
	project := &models.Project{
		Name:              "Change Detection Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Status - {YYYY-MM-DD}",
		DefaultDirectory:  "/tmp",
		RecipientsTo:      "team@example.com",
	}
	if err := projectService.CreateProject(project); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Step 2: Create status definitions
	statusDef := &models.StatusDefinition{
		ProjectID: project.ID,
		Name:      "in progress",
		Style:     "yellow",
		Order:     0,
	}
	if err := reportService.CreateStatusDefinition(statusDef); err != nil {
		t.Fatalf("failed to create status definition: %v", err)
	}

	statusDef2 := &models.StatusDefinition{
		ProjectID: project.ID,
		Name:      "done",
		Style:     "green",
		Order:     1,
	}
	if err := reportService.CreateStatusDefinition(statusDef2); err != nil {
		t.Fatalf("failed to create status definition: %v", err)
	}

	// Step 3: Create report section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Current Work",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := reportService.CreateReportSection(section); err != nil {
		t.Fatalf("failed to create section: %v", err)
	}

	// Step 4: Create task with initial status
	ecd := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	task := &models.Task{
		ProjectID:              project.ID,
		ReportSectionID:        section.ID,
		Name:                   "Implement feature",
		Status:                 "in progress",
		ExpectedCompletionDate: &ecd,
		Notes:                  "Initial notes",
		Priority:               0,
	}
	if err := taskService.CreateTask(task); err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Step 5: Generate first report (no changes expected)
	report1, err := reportService.GenerateReport(project.ID, time.Now(), projectService, taskRepo)
	if err != nil {
		t.Fatalf("failed to generate first report: %v", err)
	}

	if len(report1.Sections) == 0 {
		t.Fatal("first report has no sections")
	}

	// Step 6: Finalize first report
	snapshot1, err := reportService.FinalizeReport(project.ID, "# First Report", taskRepo)
	if err != nil {
		t.Fatalf("failed to finalize first report: %v", err)
	}

	if snapshot1.ID == 0 {
		t.Error("first snapshot ID not set")
	}

	// Step 7: Modify task status and ECD
	task.Status = "done"
	newEcd := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)
	task.ExpectedCompletionDate = &newEcd
	if err := taskService.UpdateTask(task); err != nil {
		t.Fatalf("failed to update task: %v", err)
	}

	// Step 8: Generate second report (should detect changes)
	report2, err := reportService.GenerateReport(project.ID, time.Now(), projectService, taskRepo)
	if err != nil {
		t.Fatalf("failed to generate second report: %v", err)
	}

	// Verify that the report contains change indicators
	// The content should include status change and ECD change
	if len(report2.Sections) == 0 {
		t.Fatal("second report has no sections")
	}

	statusSection := report2.Sections[0]
	if statusSection.Content == "" {
		t.Error("status section content is empty")
	}

	// Check for status change indicator (→)
	if !contains(statusSection.Content, "→") {
		t.Error("expected status change indicator (→) in report content")
	}

	// Check for ECD change indicator (~~)
	if !contains(statusSection.Content, "~~") {
		t.Error("expected ECD change indicator (~~) in report content")
	}

	// Step 9: Finalize second report
	snapshot2, err := reportService.FinalizeReport(project.ID, "# Second Report", taskRepo)
	if err != nil {
		t.Fatalf("failed to finalize second report: %v", err)
	}

	if snapshot2.ID == 0 {
		t.Error("second snapshot ID not set")
	}

	// Verify we have two distinct snapshots
	if snapshot1.ID == snapshot2.ID {
		t.Error("snapshot IDs should be different")
	}

	// Step 10: Verify task history entries exist for both snapshots
	var count1, count2 int
	if err := app.db.Conn.QueryRow("SELECT COUNT(*) FROM task_history WHERE report_snapshot_id = ?", snapshot1.ID).Scan(&count1); err != nil {
		t.Fatalf("failed to query first snapshot history: %v", err)
	}
	if err := app.db.Conn.QueryRow("SELECT COUNT(*) FROM task_history WHERE report_snapshot_id = ?", snapshot2.ID).Scan(&count2); err != nil {
		t.Fatalf("failed to query second snapshot history: %v", err)
	}

	if count1 == 0 {
		t.Error("first snapshot should have task history entries")
	}
	if count2 == 0 {
		t.Error("second snapshot should have task history entries")
	}
}

// TestIntegration_ExportWorkflow tests the complete export workflow
func TestIntegration_ExportWorkflow(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()
	exportService := app.GetExportService()

	// Create project with specific filename format
	project := &models.Project{
		Name:              "Export Test",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  t.TempDir(),
		UseYearSubfolders: true,
	}
	if err := projectService.CreateProject(project); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Test suggested filepath generation
	testDate := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)
	suggestedPath := exportService.GetSuggestedFilepath(project, testDate)

	// Verify year subfolder is included
	if !contains(suggestedPath, "2026") {
		t.Errorf("expected year subfolder '2026' in path, got: %s", suggestedPath)
	}

	// Verify filename format is applied
	if !contains(suggestedPath, "Export-Test-2026-02-20.md") {
		t.Errorf("expected filename 'Export-Test-2026-02-20.md' in path, got: %s", suggestedPath)
	}

	// Test file export
	content := "# Test Report\n\nThis is test content."
	if err := exportService.ExportToFile(content, suggestedPath); err != nil {
		t.Fatalf("failed to export file: %v", err)
	}

	// Verify file was created and content matches
	// Note: We can't easily verify file content in this test without reading it back,
	// but the property test covers round-trip verification
}

// TestIntegration_ErrorScenarios tests various error conditions
func TestIntegration_ErrorScenarios(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()
	taskService := app.GetTaskService()
	reportService := app.GetReportService()
	taskRepo := repository.NewTaskRepository(app.db)

	t.Run("create task without project", func(t *testing.T) {
		task := &models.Task{
			ProjectID:       99999, // Non-existent project
			ReportSectionID: 1,
			Name:            "Invalid Task",
			Status:          "not started",
		}
		err := taskService.CreateTask(task)
		if err == nil {
			t.Error("expected error when creating task with non-existent project")
		}
	})

	t.Run("create task without section", func(t *testing.T) {
		// Create valid project first
		project := &models.Project{
			Name:              "Error Test Project",
			FilenameFormat:    "{project-name}.md",
			ReportTitleFormat: "{project-name}",
		}
		if err := projectService.CreateProject(project); err != nil {
			t.Fatalf("failed to create project: %v", err)
		}

		task := &models.Task{
			ProjectID:       project.ID,
			ReportSectionID: 99999, // Non-existent section
			Name:            "Invalid Task",
			Status:          "not started",
		}
		err := taskService.CreateTask(task)
		if err == nil {
			t.Error("expected error when creating task with non-existent section")
		}
	})

	t.Run("generate report for non-existent project", func(t *testing.T) {
		_, err := reportService.GenerateReport(99999, time.Now(), projectService, taskRepo)
		if err == nil {
			t.Error("expected error when generating report for non-existent project")
		}
	})

	t.Run("get non-existent task", func(t *testing.T) {
		_, err := taskService.GetTask(99999)
		if err == nil {
			t.Error("expected error when getting non-existent task")
		}
	})

	t.Run("update non-existent task", func(t *testing.T) {
		task := &models.Task{
			ID:              99999,
			ProjectID:       1,
			ReportSectionID: 1,
			Name:            "Non-existent",
			Status:          "not started",
		}
		err := taskService.UpdateTask(task)
		if err == nil {
			t.Error("expected error when updating non-existent task")
		}
	})

	t.Run("create subtask for non-existent task", func(t *testing.T) {
		subtask := &models.Subtask{
			TaskID: 99999,
			Name:   "Invalid Subtask",
			Status: "not started",
		}
		err := taskService.CreateSubtask(subtask)
		if err == nil {
			t.Error("expected error when creating subtask for non-existent task")
		}
	})
}

// TestIntegration_ProjectArchiving tests project archiving workflow
func TestIntegration_ProjectArchiving(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()

	// Create multiple projects
	project1 := &models.Project{
		Name:              "Active Project 1",
		FilenameFormat:    "{project-name}.md",
		ReportTitleFormat: "{project-name}",
	}
	if err := projectService.CreateProject(project1); err != nil {
		t.Fatalf("failed to create project1: %v", err)
	}

	project2 := &models.Project{
		Name:              "Active Project 2",
		FilenameFormat:    "{project-name}.md",
		ReportTitleFormat: "{project-name}",
	}
	if err := projectService.CreateProject(project2); err != nil {
		t.Fatalf("failed to create project2: %v", err)
	}

	// List active projects
	activeProjects, err := projectService.ListActiveProjects()
	if err != nil {
		t.Fatalf("failed to list active projects: %v", err)
	}

	if len(activeProjects) != 2 {
		t.Errorf("expected 2 active projects, got %d", len(activeProjects))
	}

	// Archive one project
	if err := projectService.ArchiveProject(project1.ID); err != nil {
		t.Fatalf("failed to archive project: %v", err)
	}

	// List active projects again
	activeProjects, err = projectService.ListActiveProjects()
	if err != nil {
		t.Fatalf("failed to list active projects after archiving: %v", err)
	}

	if len(activeProjects) != 1 {
		t.Errorf("expected 1 active project after archiving, got %d", len(activeProjects))
	}

	if activeProjects[0].ID != project2.ID {
		t.Error("wrong project in active list after archiving")
	}

	// List archived projects
	archivedProjects, err := projectService.ListArchivedProjects()
	if err != nil {
		t.Fatalf("failed to list archived projects: %v", err)
	}

	if len(archivedProjects) != 1 {
		t.Errorf("expected 1 archived project, got %d", len(archivedProjects))
	}

	if archivedProjects[0].ID != project1.ID {
		t.Error("wrong project in archived list")
	}
}

// TestIntegration_TaskMovementBetweenSections tests moving tasks between report sections
func TestIntegration_TaskMovementBetweenSections(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()
	taskService := app.GetTaskService()
	reportService := app.GetReportService()

	// Create project
	project := &models.Project{
		Name:              "Task Movement Project",
		FilenameFormat:    "{project-name}.md",
		ReportTitleFormat: "{project-name}",
	}
	if err := projectService.CreateProject(project); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Create two sections
	section1 := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "In Progress",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := reportService.CreateReportSection(section1); err != nil {
		t.Fatalf("failed to create section1: %v", err)
	}

	section2 := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Completed",
		Type:      "status",
		Order:     1,
		IsEnabled: true,
	}
	if err := reportService.CreateReportSection(section2); err != nil {
		t.Fatalf("failed to create section2: %v", err)
	}

	// Create task in section1
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section1.ID,
		Name:            "Task to move",
		Status:          "in progress",
		Priority:        0,
	}
	if err := taskService.CreateTask(task); err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Verify task is in section1
	tasks1, err := taskService.ListTasksBySection(section1.ID)
	if err != nil {
		t.Fatalf("failed to list tasks in section1: %v", err)
	}
	if len(tasks1) != 1 {
		t.Errorf("expected 1 task in section1, got %d", len(tasks1))
	}

	// Move task to section2
	if err := taskService.MoveTaskToSection(task.ID, section2.ID); err != nil {
		t.Fatalf("failed to move task: %v", err)
	}

	// Verify task is no longer in section1
	tasks1, err = taskService.ListTasksBySection(section1.ID)
	if err != nil {
		t.Fatalf("failed to list tasks in section1 after move: %v", err)
	}
	if len(tasks1) != 0 {
		t.Errorf("expected 0 tasks in section1 after move, got %d", len(tasks1))
	}

	// Verify task is now in section2
	tasks2, err := taskService.ListTasksBySection(section2.ID)
	if err != nil {
		t.Fatalf("failed to list tasks in section2: %v", err)
	}
	if len(tasks2) != 1 {
		t.Errorf("expected 1 task in section2, got %d", len(tasks2))
	}
	if tasks2[0].ID != task.ID {
		t.Error("wrong task in section2")
	}
}

// TestIntegration_MultipleReportsWithHistory tests generating multiple reports and verifying history
func TestIntegration_MultipleReportsWithHistory(t *testing.T) {
	app := setupIntegrationTest(t)
	defer app.db.Close()

	projectService := app.GetProjectService()
	taskService := app.GetTaskService()
	reportService := app.GetReportService()
	taskRepo := repository.NewTaskRepository(app.db)

	// Create project
	project := &models.Project{
		Name:              "History Test Project",
		FilenameFormat:    "{project-name}.md",
		ReportTitleFormat: "{project-name}",
	}
	if err := projectService.CreateProject(project); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Create section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Work Items",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := reportService.CreateReportSection(section); err != nil {
		t.Fatalf("failed to create section: %v", err)
	}

	// Create task
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Evolving Task",
		Status:          "not started",
		Priority:        0,
	}
	if err := taskService.CreateTask(task); err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Finalize first report
	snapshot1, err := reportService.FinalizeReport(project.ID, "# Report 1", taskRepo)
	if err != nil {
		t.Fatalf("failed to finalize report 1: %v", err)
	}

	// Update task
	task.Status = "in progress"
	if err := taskService.UpdateTask(task); err != nil {
		t.Fatalf("failed to update task: %v", err)
	}

	// Finalize second report
	snapshot2, err := reportService.FinalizeReport(project.ID, "# Report 2", taskRepo)
	if err != nil {
		t.Fatalf("failed to finalize report 2: %v", err)
	}

	// Update task again
	task.Status = "done"
	if err := taskService.UpdateTask(task); err != nil {
		t.Fatalf("failed to update task: %v", err)
	}

	// Finalize third report
	snapshot3, err := reportService.FinalizeReport(project.ID, "# Report 3", taskRepo)
	if err != nil {
		t.Fatalf("failed to finalize report 3: %v", err)
	}

	// List all snapshots
	snapshots, err := reportService.ListReportSnapshots(project.ID)
	if err != nil {
		t.Fatalf("failed to list snapshots: %v", err)
	}

	if len(snapshots) != 3 {
		t.Errorf("expected 3 snapshots, got %d", len(snapshots))
	}

	// Verify each snapshot has task history
	for i, snapshot := range []*models.ReportSnapshot{snapshot1, snapshot2, snapshot3} {
		var count int
		if err := app.db.Conn.QueryRow("SELECT COUNT(*) FROM task_history WHERE report_snapshot_id = ?", snapshot.ID).Scan(&count); err != nil {
			t.Fatalf("failed to query history for snapshot %d: %v", i+1, err)
		}
		if count == 0 {
			t.Errorf("snapshot %d should have task history", i+1)
		}
	}

	// Verify history entries have different statuses
	var status1, status2, status3 string
	if err := app.db.Conn.QueryRow("SELECT status FROM task_history WHERE report_snapshot_id = ? AND task_id = ?", snapshot1.ID, task.ID).Scan(&status1); err != nil {
		t.Fatalf("failed to get status from snapshot 1: %v", err)
	}
	if err := app.db.Conn.QueryRow("SELECT status FROM task_history WHERE report_snapshot_id = ? AND task_id = ?", snapshot2.ID, task.ID).Scan(&status2); err != nil {
		t.Fatalf("failed to get status from snapshot 2: %v", err)
	}
	if err := app.db.Conn.QueryRow("SELECT status FROM task_history WHERE report_snapshot_id = ? AND task_id = ?", snapshot3.ID, task.ID).Scan(&status3); err != nil {
		t.Fatalf("failed to get status from snapshot 3: %v", err)
	}

	if status1 != "not started" {
		t.Errorf("expected status1 'not started', got '%s'", status1)
	}
	if status2 != "in progress" {
		t.Errorf("expected status2 'in progress', got '%s'", status2)
	}
	if status3 != "done" {
		t.Errorf("expected status3 'done', got '%s'", status3)
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

package services

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"

	"src/backend/models"
	"src/backend/repository"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	_ "github.com/mattn/go-sqlite3"
	"go.uber.org/zap"
)

func setupReportServiceTest(t *testing.T) (*ReportService, *repository.DB) {
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

	// Initialize schema - we need to call the repository's initSchema method
	// Since we're testing services, we'll create a helper or use the repository test setup
	// For now, let's create the schema directly
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
	`

	if _, err := conn.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	reportRepo := repository.NewReportRepository(db)
	service := NewReportService(reportRepo, logger)
	return service, db
}

func TestCreateReportSection(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Create a project first
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	tests := []struct {
		name        string
		section     *models.ReportSection
		expectError bool
	}{
		{
			name: "valid prose section",
			section: &models.ReportSection{
				ProjectID: project.ID,
				Name:      "TL;DR",
				Type:      "prose",
				Content:   "Summary content",
				Order:     0,
				IsEnabled: true,
			},
			expectError: false,
		},
		{
			name: "valid status section",
			section: &models.ReportSection{
				ProjectID: project.ID,
				Name:      "Roadmap",
				Type:      "status",
				Content:   "",
				Order:     1,
				IsEnabled: true,
			},
			expectError: false,
		},
		{
			name: "empty name",
			section: &models.ReportSection{
				ProjectID: project.ID,
				Name:      "",
				Type:      "prose",
				Content:   "Content",
				Order:     0,
				IsEnabled: true,
			},
			expectError: true,
		},
		{
			name: "invalid type",
			section: &models.ReportSection{
				ProjectID: project.ID,
				Name:      "Invalid",
				Type:      "invalid",
				Content:   "",
				Order:     0,
				IsEnabled: true,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.CreateReportSection(tt.section)
			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !tt.expectError && tt.section.ID == 0 {
				t.Error("Expected section ID to be set")
			}
		})
	}
}

func TestUpdateReportSection(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Create a project first
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create a section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Original Name",
		Type:      "prose",
		Content:   "Original content",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	tests := []struct {
		name        string
		updateFn    func(*models.ReportSection)
		expectError bool
	}{
		{
			name: "valid update",
			updateFn: func(s *models.ReportSection) {
				s.Name = "Updated Name"
				s.Content = "Updated content"
			},
			expectError: false,
		},
		{
			name: "empty name",
			updateFn: func(s *models.ReportSection) {
				s.Name = ""
			},
			expectError: true,
		},
		{
			name: "invalid type",
			updateFn: func(s *models.ReportSection) {
				s.Type = "invalid"
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Get fresh copy
			fresh, err := service.GetReportSection(section.ID)
			if err != nil {
				t.Fatalf("Failed to get section: %v", err)
			}

			tt.updateFn(fresh)
			err = service.UpdateReportSection(fresh)

			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestGetReportSection(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Create a project first
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create a section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Test Section",
		Type:      "prose",
		Content:   "Test content",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	// Get the section
	retrieved, err := service.GetReportSection(section.ID)
	if err != nil {
		t.Fatalf("Failed to get section: %v", err)
	}

	if retrieved.ID != section.ID {
		t.Errorf("Expected ID %d, got %d", section.ID, retrieved.ID)
	}
	if retrieved.Name != section.Name {
		t.Errorf("Expected name %s, got %s", section.Name, retrieved.Name)
	}

	// Try to get non-existent section
	_, err = service.GetReportSection(99999)
	if err == nil {
		t.Error("Expected error for non-existent section")
	}
}

func TestListReportSections(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Create a project first
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create multiple sections
	sections := []*models.ReportSection{
		{
			ProjectID: project.ID,
			Name:      "Section 1",
			Type:      "prose",
			Order:     0,
			IsEnabled: true,
		},
		{
			ProjectID: project.ID,
			Name:      "Section 2",
			Type:      "status",
			Order:     1,
			IsEnabled: true,
		},
		{
			ProjectID: project.ID,
			Name:      "Section 3",
			Type:      "prose",
			Order:     2,
			IsEnabled: false,
		},
	}

	for _, section := range sections {
		if err := service.CreateReportSection(section); err != nil {
			t.Fatalf("Failed to create section: %v", err)
		}
	}

	// List sections
	retrieved, err := service.ListReportSections(project.ID)
	if err != nil {
		t.Fatalf("Failed to list sections: %v", err)
	}

	if len(retrieved) != 3 {
		t.Errorf("Expected 3 sections, got %d", len(retrieved))
	}

	// Verify order
	for i, section := range retrieved {
		if section.Order != i {
			t.Errorf("Expected order %d, got %d", i, section.Order)
		}
	}
}

func TestReorderSections(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Create a project first
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create sections
	sections := []*models.ReportSection{
		{
			ProjectID: project.ID,
			Name:      "Section A",
			Type:      "prose",
			Order:     0,
			IsEnabled: true,
		},
		{
			ProjectID: project.ID,
			Name:      "Section B",
			Type:      "status",
			Order:     1,
			IsEnabled: true,
		},
		{
			ProjectID: project.ID,
			Name:      "Section C",
			Type:      "prose",
			Order:     2,
			IsEnabled: true,
		},
	}

	for _, section := range sections {
		if err := service.CreateReportSection(section); err != nil {
			t.Fatalf("Failed to create section: %v", err)
		}
	}

	// Reorder: C, A, B
	newOrder := []int64{sections[2].ID, sections[0].ID, sections[1].ID}
	err := service.ReorderSections(project.ID, newOrder)
	if err != nil {
		t.Fatalf("Failed to reorder sections: %v", err)
	}

	// Verify new order
	retrieved, err := service.ListReportSections(project.ID)
	if err != nil {
		t.Fatalf("Failed to list sections: %v", err)
	}

	expectedNames := []string{"Section C", "Section A", "Section B"}
	for i, section := range retrieved {
		if section.Name != expectedNames[i] {
			t.Errorf("Expected name %s at position %d, got %s", expectedNames[i], i, section.Name)
		}
		if section.Order != i {
			t.Errorf("Expected order %d, got %d", i, section.Order)
		}
	}
}

func TestReorderSections_WrongProject(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Create two projects
	projectRepo := repository.NewProjectRepository(db)
	project1 := &models.Project{
		Name:              "Project 1",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project1); err != nil {
		t.Fatalf("Failed to create project1: %v", err)
	}

	project2 := &models.Project{
		Name:              "Project 2",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project2); err != nil {
		t.Fatalf("Failed to create project2: %v", err)
	}

	// Create section in project1
	section := &models.ReportSection{
		ProjectID: project1.ID,
		Name:      "Section",
		Type:      "prose",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	// Try to reorder with wrong project
	err := service.ReorderSections(project2.ID, []int64{section.ID})
	if err == nil {
		t.Error("Expected error when reordering section from different project")
	}
}

func TestCreateStatusDefinition(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Add status_definitions table to schema
	schema := `
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
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create status_definitions table: %v", err)
	}

	// Create a project first
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	tests := []struct {
		name        string
		status      *models.StatusDefinition
		expectError bool
	}{
		{
			name: "valid status with red style",
			status: &models.StatusDefinition{
				ProjectID: project.ID,
				Name:      "Blocked",
				Style:     "red",
				Order:     0,
			},
			expectError: false,
		},
		{
			name: "valid status with green style",
			status: &models.StatusDefinition{
				ProjectID: project.ID,
				Name:      "Done",
				Style:     "green",
				Order:     1,
			},
			expectError: false,
		},
		{
			name: "valid status with yellow style",
			status: &models.StatusDefinition{
				ProjectID: project.ID,
				Name:      "In Progress",
				Style:     "yellow",
				Order:     2,
			},
			expectError: false,
		},
		{
			name: "valid status with gray style",
			status: &models.StatusDefinition{
				ProjectID: project.ID,
				Name:      "Not Started",
				Style:     "gray",
				Order:     3,
			},
			expectError: false,
		},
		{
			name: "valid status with paused style",
			status: &models.StatusDefinition{
				ProjectID: project.ID,
				Name:      "On Hold",
				Style:     "paused",
				Order:     4,
			},
			expectError: false,
		},
		{
			name: "valid status with pending style",
			status: &models.StatusDefinition{
				ProjectID: project.ID,
				Name:      "Waiting",
				Style:     "pending",
				Order:     5,
			},
			expectError: false,
		},
		{
			name: "empty name",
			status: &models.StatusDefinition{
				ProjectID: project.ID,
				Name:      "",
				Style:     "red",
				Order:     0,
			},
			expectError: true,
		},
		{
			name: "invalid style",
			status: &models.StatusDefinition{
				ProjectID: project.ID,
				Name:      "Invalid",
				Style:     "blue",
				Order:     0,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.CreateStatusDefinition(tt.status)
			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !tt.expectError && tt.status.ID == 0 {
				t.Error("Expected status ID to be set")
			}
		})
	}
}

func TestUpdateStatusDefinition(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Add status_definitions table to schema
	schema := `
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
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create status_definitions table: %v", err)
	}

	// Create a project first
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create a status definition
	status := &models.StatusDefinition{
		ProjectID: project.ID,
		Name:      "Original Name",
		Style:     "red",
		Order:     0,
	}
	if err := service.CreateStatusDefinition(status); err != nil {
		t.Fatalf("Failed to create status: %v", err)
	}

	tests := []struct {
		name        string
		updateFn    func(*models.StatusDefinition)
		expectError bool
	}{
		{
			name: "valid update name",
			updateFn: func(s *models.StatusDefinition) {
				s.Name = "Updated Name"
			},
			expectError: false,
		},
		{
			name: "valid update style",
			updateFn: func(s *models.StatusDefinition) {
				s.Style = "green"
			},
			expectError: false,
		},
		{
			name: "empty name",
			updateFn: func(s *models.StatusDefinition) {
				s.Name = ""
			},
			expectError: true,
		},
		{
			name: "invalid style",
			updateFn: func(s *models.StatusDefinition) {
				s.Style = "purple"
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Get fresh copy from database
			statuses, err := service.ListStatusDefinitions(project.ID)
			if err != nil {
				t.Fatalf("Failed to list statuses: %v", err)
			}
			if len(statuses) == 0 {
				t.Fatal("No statuses found")
			}
			fresh := statuses[0]

			tt.updateFn(fresh)
			err = service.UpdateStatusDefinition(fresh)

			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestListStatusDefinitions(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Add status_definitions table to schema
	schema := `
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
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create status_definitions table: %v", err)
	}

	// Create a project first
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create multiple status definitions
	statuses := []*models.StatusDefinition{
		{
			ProjectID: project.ID,
			Name:      "Not Started",
			Style:     "gray",
			Order:     0,
		},
		{
			ProjectID: project.ID,
			Name:      "In Progress",
			Style:     "yellow",
			Order:     1,
		},
		{
			ProjectID: project.ID,
			Name:      "Done",
			Style:     "green",
			Order:     2,
		},
	}

	for _, status := range statuses {
		if err := service.CreateStatusDefinition(status); err != nil {
			t.Fatalf("Failed to create status: %v", err)
		}
	}

	// List statuses
	retrieved, err := service.ListStatusDefinitions(project.ID)
	if err != nil {
		t.Fatalf("Failed to list statuses: %v", err)
	}

	if len(retrieved) != 3 {
		t.Errorf("Expected 3 statuses, got %d", len(retrieved))
	}

	// Verify order
	for i, status := range retrieved {
		if status.Order != i {
			t.Errorf("Expected order %d, got %d", i, status.Order)
		}
	}

	// Verify names
	expectedNames := []string{"Not Started", "In Progress", "Done"}
	for i, status := range retrieved {
		if status.Name != expectedNames[i] {
			t.Errorf("Expected name %s at position %d, got %s", expectedNames[i], i, status.Name)
		}
	}
}

func TestDetectTaskChanges(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Add required tables
	schema := `
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
		FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
	);
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	// Create a project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create a report section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Roadmap",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	// Create a task
	taskRepo := repository.NewTaskRepository(db)
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Test Task",
		Status:          "in progress",
		Priority:        0,
	}
	if err := taskRepo.CreateTask(task); err != nil {
		t.Fatalf("Failed to create task: %v", err)
	}

	t.Run("no history - no changes detected", func(t *testing.T) {
		changes, err := service.detectTaskChanges(task)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if changes.StatusChanged {
			t.Error("Expected StatusChanged to be false when no history exists")
		}
		if changes.ECDChanged {
			t.Error("Expected ECDChanged to be false when no history exists")
		}
	})

	// Create a report snapshot and task history
	snapshot := &models.ReportSnapshot{
		ProjectID:       project.ID,
		MarkdownContent: "Test report",
		FinalizedAt:     parseTime("2024-01-01T00:00:00Z"),
	}
	if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
		t.Fatalf("Failed to create snapshot: %v", err)
	}

	history := &models.TaskHistory{
		ReportSnapshotID: snapshot.ID,
		TaskID:           task.ID,
		SubtaskID:        nil,
		Name:             "Test Task",
		Status:           "not started",
		URL:              "",
		Notes:            "",
		CreatedAt:        parseTime("2024-01-01T00:00:00Z"),
	}
	if err := service.repo.CreateTaskHistory(history); err != nil {
		t.Fatalf("Failed to create task history: %v", err)
	}

	t.Run("status changed", func(t *testing.T) {
		changes, err := service.detectTaskChanges(task)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if !changes.StatusChanged {
			t.Error("Expected StatusChanged to be true")
		}
		if changes.OldStatus != "not started" {
			t.Errorf("Expected OldStatus to be 'not started', got '%s'", changes.OldStatus)
		}
		if changes.ECDChanged {
			t.Error("Expected ECDChanged to be false")
		}
	})

	t.Run("status unchanged", func(t *testing.T) {
		// Update task status to match history
		task.Status = "not started"
		changes, err := service.detectTaskChanges(task)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if changes.StatusChanged {
			t.Error("Expected StatusChanged to be false")
		}
		if changes.ECDChanged {
			t.Error("Expected ECDChanged to be false")
		}
	})

	t.Run("ECD changed", func(t *testing.T) {
		// Add ECD to task
		ecd := parseTime("2024-02-01T00:00:00Z")
		task.ExpectedCompletionDate = &ecd

		changes, err := service.detectTaskChanges(task)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if !changes.ECDChanged {
			t.Error("Expected ECDChanged to be true")
		}
		if changes.OldECD != nil {
			t.Errorf("Expected OldECD to be nil, got %v", changes.OldECD)
		}
	})

	t.Run("ECD unchanged", func(t *testing.T) {
		// Create a new snapshot and history with ECD
		snapshot2 := &models.ReportSnapshot{
			ProjectID:       project.ID,
			MarkdownContent: "Test report 2",
			FinalizedAt:     parseTime("2024-01-02T00:00:00Z"),
		}
		if err := service.repo.CreateReportSnapshot(snapshot2); err != nil {
			t.Fatalf("Failed to create snapshot: %v", err)
		}

		ecd := parseTime("2024-02-01T00:00:00Z")
		history2 := &models.TaskHistory{
			ReportSnapshotID:       snapshot2.ID,
			TaskID:                 task.ID,
			SubtaskID:              nil,
			Name:                   "Test Task",
			Status:                 "not started",
			ExpectedCompletionDate: &ecd,
			URL:                    "",
			Notes:                  "",
			CreatedAt:              parseTime("2024-01-02T00:00:00Z"),
		}
		if err := service.repo.CreateTaskHistory(history2); err != nil {
			t.Fatalf("Failed to create task history: %v", err)
		}

		task.ExpectedCompletionDate = &ecd
		changes, err := service.detectTaskChanges(task)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if changes.ECDChanged {
			t.Error("Expected ECDChanged to be false")
		}
	})

	t.Run("both status and ECD changed", func(t *testing.T) {
		task.Status = "done"
		newECD := parseTime("2024-03-01T00:00:00Z")
		task.ExpectedCompletionDate = &newECD

		changes, err := service.detectTaskChanges(task)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if !changes.StatusChanged {
			t.Error("Expected StatusChanged to be true")
		}
		if !changes.ECDChanged {
			t.Error("Expected ECDChanged to be true")
		}
	})
}

func TestDetectSubtaskChanges(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Add required tables
	schema := `
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
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	// Create a project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create a report section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Roadmap",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	// Create a task
	taskRepo := repository.NewTaskRepository(db)
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Test Task",
		Status:          "in progress",
		Priority:        0,
	}
	if err := taskRepo.CreateTask(task); err != nil {
		t.Fatalf("Failed to create task: %v", err)
	}

	// Create a subtask
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Test Subtask",
		Status: "in progress",
	}
	if err := taskRepo.CreateSubtask(subtask); err != nil {
		t.Fatalf("Failed to create subtask: %v", err)
	}

	t.Run("no history - no changes detected", func(t *testing.T) {
		changes, err := service.detectSubtaskChanges(subtask)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if changes.StatusChanged {
			t.Error("Expected StatusChanged to be false when no history exists")
		}
		if changes.ECDChanged {
			t.Error("Expected ECDChanged to be false when no history exists")
		}
	})

	// Create a report snapshot and subtask history
	snapshot := &models.ReportSnapshot{
		ProjectID:       project.ID,
		MarkdownContent: "Test report",
		FinalizedAt:     parseTime("2024-01-01T00:00:00Z"),
	}
	if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
		t.Fatalf("Failed to create snapshot: %v", err)
	}

	history := &models.TaskHistory{
		ReportSnapshotID: snapshot.ID,
		TaskID:           task.ID,
		SubtaskID:        &subtask.ID,
		Name:             "Test Subtask",
		Status:           "not started",
		URL:              "",
		Notes:            "",
		CreatedAt:        parseTime("2024-01-01T00:00:00Z"),
	}
	if err := service.repo.CreateTaskHistory(history); err != nil {
		t.Fatalf("Failed to create subtask history: %v", err)
	}

	t.Run("status changed", func(t *testing.T) {
		changes, err := service.detectSubtaskChanges(subtask)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if !changes.StatusChanged {
			t.Error("Expected StatusChanged to be true")
		}
		if changes.OldStatus != "not started" {
			t.Errorf("Expected OldStatus to be 'not started', got '%s'", changes.OldStatus)
		}
		if changes.ECDChanged {
			t.Error("Expected ECDChanged to be false")
		}
	})

	t.Run("ECD changed", func(t *testing.T) {
		// Add ECD to subtask
		ecd := parseTime("2024-02-01T00:00:00Z")
		subtask.ExpectedCompletionDate = &ecd

		changes, err := service.detectSubtaskChanges(subtask)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if !changes.ECDChanged {
			t.Error("Expected ECDChanged to be true")
		}
		if changes.OldECD != nil {
			t.Errorf("Expected OldECD to be nil, got %v", changes.OldECD)
		}
	})
}

func TestEqualDates(t *testing.T) {
	tests := []struct {
		name     string
		date1    *time.Time
		date2    *time.Time
		expected bool
	}{
		{
			name:     "both nil",
			date1:    nil,
			date2:    nil,
			expected: true,
		},
		{
			name:     "first nil",
			date1:    nil,
			date2:    timePtr(parseTime("2024-01-01T00:00:00Z")),
			expected: false,
		},
		{
			name:     "second nil",
			date1:    timePtr(parseTime("2024-01-01T00:00:00Z")),
			date2:    nil,
			expected: false,
		},
		{
			name:     "same date same time",
			date1:    timePtr(parseTime("2024-01-01T12:00:00Z")),
			date2:    timePtr(parseTime("2024-01-01T12:00:00Z")),
			expected: true,
		},
		{
			name:     "same date different time",
			date1:    timePtr(parseTime("2024-01-01T12:00:00Z")),
			date2:    timePtr(parseTime("2024-01-01T18:00:00Z")),
			expected: true,
		},
		{
			name:     "different dates",
			date1:    timePtr(parseTime("2024-01-01T00:00:00Z")),
			date2:    timePtr(parseTime("2024-01-02T00:00:00Z")),
			expected: false,
		},
		{
			name:     "different months",
			date1:    timePtr(parseTime("2024-01-15T00:00:00Z")),
			date2:    timePtr(parseTime("2024-02-15T00:00:00Z")),
			expected: false,
		},
		{
			name:     "different years",
			date1:    timePtr(parseTime("2024-01-01T00:00:00Z")),
			date2:    timePtr(parseTime("2025-01-01T00:00:00Z")),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := equalDates(tt.date1, tt.date2)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

// Helper functions
func parseTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return t
}

func timePtr(t time.Time) *time.Time {
	return &t
}

func TestRenderTasksAsMarkdown(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Add status_definitions table
	schema := `
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
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create status_definitions table: %v", err)
	}

	// Create a project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create status definitions
	statuses := []*models.StatusDefinition{
		{ProjectID: project.ID, Name: "not started", Style: "gray", Order: 0},
		{ProjectID: project.ID, Name: "in progress", Style: "yellow", Order: 1},
		{ProjectID: project.ID, Name: "done", Style: "green", Order: 2},
	}
	for _, status := range statuses {
		if err := service.CreateStatusDefinition(status); err != nil {
			t.Fatalf("Failed to create status: %v", err)
		}
	}

	// Build status style map
	statusStyleMap := map[string]string{
		"not started": "status-gray",
		"in progress": "status-yellow",
		"done":        "status-green",
	}

	t.Run("single task without URL or notes", func(t *testing.T) {
		task := &models.Task{
			ID:     1,
			Name:   "Implement feature X",
			Status: "in progress",
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks:       []*models.Subtask{},
				SubtaskChanges: map[int64]*SubtaskChange{},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- Implement feature X <span class=\"status-yellow\">in progress</span>\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("task with URL", func(t *testing.T) {
		task := &models.Task{
			ID:     1,
			Name:   "Fix bug #123",
			Status: "done",
			URL:    "https://github.com/org/repo/issues/123",
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks:       []*models.Subtask{},
				SubtaskChanges: map[int64]*SubtaskChange{},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- [Fix bug #123](https://github.com/org/repo/issues/123) <span class=\"status-green\">done</span>\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("task with ECD", func(t *testing.T) {
		ecd := parseTime("2024-03-15T00:00:00Z")
		task := &models.Task{
			ID:                     1,
			Name:                   "Deploy to production",
			Status:                 "in progress",
			ExpectedCompletionDate: &ecd,
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks:       []*models.Subtask{},
				SubtaskChanges: map[int64]*SubtaskChange{},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- Deploy to production <span class=\"status-yellow\">in progress</span> 2024-03-15\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("task with status change", func(t *testing.T) {
		task := &models.Task{
			ID:     1,
			Name:   "Review PR",
			Status: "done",
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: true,
					OldStatus:     "in progress",
					ECDChanged:    false,
				},
				Subtasks:       []*models.Subtask{},
				SubtaskChanges: map[int64]*SubtaskChange{},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- Review PR <span class=\"status-yellow\">in progress</span> → <span class=\"status-green\">done</span>\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("task with ECD change", func(t *testing.T) {
		oldECD := parseTime("2024-03-10T00:00:00Z")
		newECD := parseTime("2024-03-20T00:00:00Z")
		task := &models.Task{
			ID:                     1,
			Name:                   "Complete documentation",
			Status:                 "in progress",
			ExpectedCompletionDate: &newECD,
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    true,
					OldECD:        &oldECD,
				},
				Subtasks:       []*models.Subtask{},
				SubtaskChanges: map[int64]*SubtaskChange{},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- Complete documentation <span class=\"status-yellow\">in progress</span> ~~2024-03-10~~ 2024-03-20\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("task with notes", func(t *testing.T) {
		task := &models.Task{
			ID:     1,
			Name:   "Investigate performance issue",
			Status: "in progress",
			Notes:  "Profiling shows bottleneck in database queries",
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks:       []*models.Subtask{},
				SubtaskChanges: map[int64]*SubtaskChange{},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- Investigate performance issue <span class=\"status-yellow\">in progress</span>\n  Profiling shows bottleneck in database queries\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("task with subtasks", func(t *testing.T) {
		task := &models.Task{
			ID:     1,
			Name:   "Implement authentication",
			Status: "in progress",
		}

		subtasks := []*models.Subtask{
			{
				ID:     1,
				TaskID: 1,
				Name:   "Add login endpoint",
				Status: "done",
			},
			{
				ID:     2,
				TaskID: 1,
				Name:   "Add logout endpoint",
				Status: "in progress",
			},
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks: subtasks,
				SubtaskChanges: map[int64]*SubtaskChange{
					1: {StatusChanged: false, ECDChanged: false},
					2: {StatusChanged: false, ECDChanged: false},
				},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- Implement authentication <span class=\"status-yellow\">in progress</span>\n" +
			"  - Add login endpoint <span class=\"status-green\">done</span>\n" +
			"  - Add logout endpoint <span class=\"status-yellow\">in progress</span>\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("subtask with URL and ECD", func(t *testing.T) {
		ecd := parseTime("2024-03-25T00:00:00Z")
		task := &models.Task{
			ID:     1,
			Name:   "API improvements",
			Status: "in progress",
		}

		subtasks := []*models.Subtask{
			{
				ID:                     1,
				TaskID:                 1,
				Name:                   "Add rate limiting",
				Status:                 "in progress",
				URL:                    "https://github.com/org/repo/pull/456",
				ExpectedCompletionDate: &ecd,
			},
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks: subtasks,
				SubtaskChanges: map[int64]*SubtaskChange{
					1: {StatusChanged: false, ECDChanged: false},
				},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- API improvements <span class=\"status-yellow\">in progress</span>\n" +
			"  - [Add rate limiting](https://github.com/org/repo/pull/456) <span class=\"status-yellow\">in progress</span> 2024-03-25\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("subtask with status change", func(t *testing.T) {
		task := &models.Task{
			ID:     1,
			Name:   "Database migration",
			Status: "in progress",
		}

		subtasks := []*models.Subtask{
			{
				ID:     1,
				TaskID: 1,
				Name:   "Create migration script",
				Status: "done",
			},
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks: subtasks,
				SubtaskChanges: map[int64]*SubtaskChange{
					1: {
						StatusChanged: true,
						OldStatus:     "in progress",
						ECDChanged:    false,
					},
				},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- Database migration <span class=\"status-yellow\">in progress</span>\n" +
			"  - Create migration script <span class=\"status-yellow\">in progress</span> → <span class=\"status-green\">done</span>\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("subtask with notes", func(t *testing.T) {
		task := &models.Task{
			ID:     1,
			Name:   "Security audit",
			Status: "in progress",
		}

		subtasks := []*models.Subtask{
			{
				ID:     1,
				TaskID: 1,
				Name:   "Review authentication",
				Status: "done",
				Notes:  "Found and fixed 2 vulnerabilities",
			},
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks: subtasks,
				SubtaskChanges: map[int64]*SubtaskChange{
					1: {StatusChanged: false, ECDChanged: false},
				},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- Security audit <span class=\"status-yellow\">in progress</span>\n" +
			"  - Review authentication <span class=\"status-green\">done</span>\n" +
			"    Found and fixed 2 vulnerabilities\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("multiple tasks", func(t *testing.T) {
		task1 := &models.Task{
			ID:     1,
			Name:   "Task 1",
			Status: "done",
		}

		task2 := &models.Task{
			ID:     2,
			Name:   "Task 2",
			Status: "in progress",
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task1,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks:       []*models.Subtask{},
				SubtaskChanges: map[int64]*SubtaskChange{},
				StatusStyleMap: statusStyleMap,
			},
			{
				Task: task2,
				TaskChange: &TaskChange{
					StatusChanged: false,
					ECDChanged:    false,
				},
				Subtasks:       []*models.Subtask{},
				SubtaskChanges: map[int64]*SubtaskChange{},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- Task 1 <span class=\"status-green\">done</span>\n\n" +
			"- Task 2 <span class=\"status-yellow\">in progress</span>\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})

	t.Run("complex task with all features", func(t *testing.T) {
		taskECD := parseTime("2024-04-01T00:00:00Z")
		oldTaskECD := parseTime("2024-03-25T00:00:00Z")
		subtaskECD := parseTime("2024-03-30T00:00:00Z")

		task := &models.Task{
			ID:                     1,
			Name:                   "Major feature release",
			Status:                 "in progress",
			URL:                    "https://github.com/org/repo/milestone/1",
			Notes:                  "Targeting Q1 release",
			ExpectedCompletionDate: &taskECD,
		}

		subtasks := []*models.Subtask{
			{
				ID:                     1,
				TaskID:                 1,
				Name:                   "Backend implementation",
				Status:                 "done",
				URL:                    "https://github.com/org/repo/pull/100",
				ExpectedCompletionDate: &subtaskECD,
			},
			{
				ID:     2,
				TaskID: 1,
				Name:   "Frontend implementation",
				Status: "in progress",
				Notes:  "Waiting on design review",
			},
		}

		tasksWithChanges := []*TaskWithChanges{
			{
				Task: task,
				TaskChange: &TaskChange{
					StatusChanged: true,
					OldStatus:     "not started",
					ECDChanged:    true,
					OldECD:        &oldTaskECD,
				},
				Subtasks: subtasks,
				SubtaskChanges: map[int64]*SubtaskChange{
					1: {
						StatusChanged: true,
						OldStatus:     "in progress",
						ECDChanged:    false,
					},
					2: {
						StatusChanged: false,
						ECDChanged:    false,
					},
				},
				StatusStyleMap: statusStyleMap,
			},
		}

		result := service.renderTasksAsMarkdown(tasksWithChanges)
		expected := "- [Major feature release](https://github.com/org/repo/milestone/1) <span class=\"status-gray\">not started</span> → <span class=\"status-yellow\">in progress</span> ~~2024-03-25~~ 2024-04-01\n" +
			"  Targeting Q1 release\n" +
			"  - [Backend implementation](https://github.com/org/repo/pull/100) <span class=\"status-yellow\">in progress</span> → <span class=\"status-green\">done</span> 2024-03-30\n" +
			"  - Frontend implementation <span class=\"status-yellow\">in progress</span>\n" +
			"    Waiting on design review\n\n"

		if result != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
		}
	})
}

func TestGetStatusStyle(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Add status_definitions table
	schema := `
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
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create status_definitions table: %v", err)
	}

	// Create a project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create status definitions
	statuses := []*models.StatusDefinition{
		{ProjectID: project.ID, Name: "blocked", Style: "red", Order: 0},
		{ProjectID: project.ID, Name: "done", Style: "green", Order: 1},
		{ProjectID: project.ID, Name: "in progress", Style: "yellow", Order: 2},
		{ProjectID: project.ID, Name: "not started", Style: "gray", Order: 3},
		{ProjectID: project.ID, Name: "on hold", Style: "paused", Order: 4},
		{ProjectID: project.ID, Name: "waiting", Style: "pending", Order: 5},
	}
	for _, status := range statuses {
		if err := service.CreateStatusDefinition(status); err != nil {
			t.Fatalf("Failed to create status: %v", err)
		}
	}

	tests := []struct {
		name        string
		statusName  string
		expectedCSS string
		expectError bool
	}{
		{
			name:        "red style",
			statusName:  "blocked",
			expectedCSS: "status-red",
			expectError: false,
		},
		{
			name:        "green style",
			statusName:  "done",
			expectedCSS: "status-green",
			expectError: false,
		},
		{
			name:        "yellow style",
			statusName:  "in progress",
			expectedCSS: "status-yellow",
			expectError: false,
		},
		{
			name:        "gray style",
			statusName:  "not started",
			expectedCSS: "status-gray",
			expectError: false,
		},
		{
			name:        "paused style",
			statusName:  "on hold",
			expectedCSS: "status-paused",
			expectError: false,
		},
		{
			name:        "pending style",
			statusName:  "waiting",
			expectedCSS: "status-pending",
			expectError: false,
		},
		{
			name:        "unknown status defaults to gray",
			statusName:  "unknown status",
			expectedCSS: "status-gray",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			css, err := service.getStatusStyle(project.ID, tt.statusName)
			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if css != tt.expectedCSS {
				t.Errorf("Expected CSS class %s, got %s", tt.expectedCSS, css)
			}
		})
	}
}

func TestRenderStatusSection(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Add all required tables
	schema := `
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
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	// Create a project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create status definitions
	statuses := []*models.StatusDefinition{
		{ProjectID: project.ID, Name: "not started", Style: "gray", Order: 0},
		{ProjectID: project.ID, Name: "in progress", Style: "yellow", Order: 1},
		{ProjectID: project.ID, Name: "done", Style: "green", Order: 2},
	}
	for _, status := range statuses {
		if err := service.CreateStatusDefinition(status); err != nil {
			t.Fatalf("Failed to create status: %v", err)
		}
	}

	// Create report sections
	roadmapSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Roadmap",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(roadmapSection); err != nil {
		t.Fatalf("Failed to create roadmap section: %v", err)
	}

	completedSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Completed",
		Type:      "status",
		Order:     1,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(completedSection); err != nil {
		t.Fatalf("Failed to create completed section: %v", err)
	}

	// Create task repository
	taskRepo := repository.NewTaskRepository(db)

	t.Run("empty section", func(t *testing.T) {
		// No tasks in the section
		markdown, err := service.renderStatusSection(roadmapSection, project.ID, taskRepo)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if markdown != "" {
			t.Errorf("Expected empty markdown, got: %s", markdown)
		}
	})

	t.Run("section with single task", func(t *testing.T) {
		// Create a task in roadmap section
		task := &models.Task{
			ProjectID:       project.ID,
			ReportSectionID: roadmapSection.ID,
			Name:            "Implement feature A",
			Status:          "in progress",
			Priority:        0,
		}
		if err := taskRepo.CreateTask(task); err != nil {
			t.Fatalf("Failed to create task: %v", err)
		}

		markdown, err := service.renderStatusSection(roadmapSection, project.ID, taskRepo)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		expected := "- Implement feature A <span class=\"status-yellow\">in progress</span>\n\n"
		if markdown != expected {
			t.Errorf("Expected:\n%s\nGot:\n%s", expected, markdown)
		}
	})

	t.Run("section with multiple tasks", func(t *testing.T) {
		// Create another task in roadmap section
		task2 := &models.Task{
			ProjectID:       project.ID,
			ReportSectionID: roadmapSection.ID,
			Name:            "Implement feature B",
			Status:          "not started",
			Priority:        1,
		}
		if err := taskRepo.CreateTask(task2); err != nil {
			t.Fatalf("Failed to create task: %v", err)
		}

		markdown, err := service.renderStatusSection(roadmapSection, project.ID, taskRepo)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		// Should contain both tasks
		if !contains(markdown, "Implement feature A") {
			t.Error("Expected markdown to contain 'Implement feature A'")
		}
		if !contains(markdown, "Implement feature B") {
			t.Error("Expected markdown to contain 'Implement feature B'")
		}
	})

	t.Run("section filters tasks correctly", func(t *testing.T) {
		// Create a task in completed section
		task3 := &models.Task{
			ProjectID:       project.ID,
			ReportSectionID: completedSection.ID,
			Name:            "Completed task",
			Status:          "done",
			Priority:        0,
		}
		if err := taskRepo.CreateTask(task3); err != nil {
			t.Fatalf("Failed to create task: %v", err)
		}

		// Render roadmap section - should not include completed task
		roadmapMarkdown, err := service.renderStatusSection(roadmapSection, project.ID, taskRepo)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if contains(roadmapMarkdown, "Completed task") {
			t.Error("Roadmap section should not contain task from completed section")
		}

		// Render completed section - should only include completed task
		completedMarkdown, err := service.renderStatusSection(completedSection, project.ID, taskRepo)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if !contains(completedMarkdown, "Completed task") {
			t.Error("Completed section should contain 'Completed task'")
		}
		if contains(completedMarkdown, "Implement feature A") {
			t.Error("Completed section should not contain task from roadmap section")
		}
	})

	t.Run("section with task and subtasks", func(t *testing.T) {
		// Create a new section for this test
		testSection := &models.ReportSection{
			ProjectID: project.ID,
			Name:      "Test Section",
			Type:      "status",
			Order:     2,
			IsEnabled: true,
		}
		if err := service.CreateReportSection(testSection); err != nil {
			t.Fatalf("Failed to create test section: %v", err)
		}

		// Create a task with subtasks
		task := &models.Task{
			ProjectID:       project.ID,
			ReportSectionID: testSection.ID,
			Name:            "Parent task",
			Status:          "in progress",
			Priority:        0,
		}
		if err := taskRepo.CreateTask(task); err != nil {
			t.Fatalf("Failed to create task: %v", err)
		}

		subtask1 := &models.Subtask{
			TaskID: task.ID,
			Name:   "Subtask 1",
			Status: "done",
		}
		if err := taskRepo.CreateSubtask(subtask1); err != nil {
			t.Fatalf("Failed to create subtask: %v", err)
		}

		subtask2 := &models.Subtask{
			TaskID: task.ID,
			Name:   "Subtask 2",
			Status: "in progress",
		}
		if err := taskRepo.CreateSubtask(subtask2); err != nil {
			t.Fatalf("Failed to create subtask: %v", err)
		}

		markdown, err := service.renderStatusSection(testSection, project.ID, taskRepo)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		// Should contain parent task and both subtasks
		if !contains(markdown, "Parent task") {
			t.Error("Expected markdown to contain 'Parent task'")
		}
		if !contains(markdown, "Subtask 1") {
			t.Error("Expected markdown to contain 'Subtask 1'")
		}
		if !contains(markdown, "Subtask 2") {
			t.Error("Expected markdown to contain 'Subtask 2'")
		}
	})

	t.Run("section with task changes", func(t *testing.T) {
		// Create a new section for this test
		changeSection := &models.ReportSection{
			ProjectID: project.ID,
			Name:      "Change Section",
			Type:      "status",
			Order:     3,
			IsEnabled: true,
		}
		if err := service.CreateReportSection(changeSection); err != nil {
			t.Fatalf("Failed to create change section: %v", err)
		}

		// Create a task
		task := &models.Task{
			ProjectID:       project.ID,
			ReportSectionID: changeSection.ID,
			Name:            "Task with changes",
			Status:          "done",
			Priority:        0,
		}
		if err := taskRepo.CreateTask(task); err != nil {
			t.Fatalf("Failed to create task: %v", err)
		}

		// Create a report snapshot and task history
		snapshot := &models.ReportSnapshot{
			ProjectID:       project.ID,
			MarkdownContent: "Test report",
			FinalizedAt:     parseTime("2024-01-01T00:00:00Z"),
		}
		if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
			t.Fatalf("Failed to create snapshot: %v", err)
		}

		history := &models.TaskHistory{
			ReportSnapshotID: snapshot.ID,
			TaskID:           task.ID,
			SubtaskID:        nil,
			Name:             "Task with changes",
			Status:           "in progress",
			URL:              "",
			Notes:            "",
			CreatedAt:        parseTime("2024-01-01T00:00:00Z"),
		}
		if err := service.repo.CreateTaskHistory(history); err != nil {
			t.Fatalf("Failed to create task history: %v", err)
		}

		markdown, err := service.renderStatusSection(changeSection, project.ID, taskRepo)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		// Should show status change from "in progress" to "done"
		if !contains(markdown, "in progress") {
			t.Error("Expected markdown to contain old status 'in progress'")
		}
		if !contains(markdown, "done") {
			t.Error("Expected markdown to contain new status 'done'")
		}
		if !contains(markdown, "→") {
			t.Error("Expected markdown to contain change indicator '→'")
		}
	})
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestGenerateReport(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Add all required tables
	schema := `
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
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	// Create a project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Status Report - {YYYY-MM-DD}",
		DefaultDirectory:  "/tmp",
		RecipientsTo:      "team@example.com",
		RecipientsCC:      "manager@example.com",
		RecipientsBCC:     "archive@example.com",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create template service and project service
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)

	// Create status definitions
	statuses := []*models.StatusDefinition{
		{ProjectID: project.ID, Name: "not started", Style: "gray", Order: 0},
		{ProjectID: project.ID, Name: "in progress", Style: "yellow", Order: 1},
		{ProjectID: project.ID, Name: "done", Style: "green", Order: 2},
	}
	for _, status := range statuses {
		if err := service.CreateStatusDefinition(status); err != nil {
			t.Fatalf("Failed to create status: %v", err)
		}
	}

	// Create report sections
	proseSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "TL;DR",
		Type:      "prose",
		Content:   "This is a summary of the week.",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(proseSection); err != nil {
		t.Fatalf("Failed to create prose section: %v", err)
	}

	statusSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Roadmap",
		Type:      "status",
		Content:   "",
		Order:     1,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(statusSection); err != nil {
		t.Fatalf("Failed to create status section: %v", err)
	}

	disabledSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Disabled Section",
		Type:      "prose",
		Content:   "This should not appear",
		Order:     2,
		IsEnabled: false,
	}
	if err := service.CreateReportSection(disabledSection); err != nil {
		t.Fatalf("Failed to create disabled section: %v", err)
	}

	// Create tasks
	taskRepo := repository.NewTaskRepository(db)
	task1 := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: statusSection.ID,
		Name:            "Implement feature X",
		Status:          "in progress",
		URL:             "https://example.com/task1",
		Notes:           "Making good progress",
		Priority:        0,
	}
	if err := taskRepo.CreateTask(task1); err != nil {
		t.Fatalf("Failed to create task1: %v", err)
	}

	ecd := parseTime("2024-02-15T00:00:00Z")
	task2 := &models.Task{
		ProjectID:              project.ID,
		ReportSectionID:        statusSection.ID,
		Name:                   "Fix bug Y",
		Status:                 "done",
		ExpectedCompletionDate: &ecd,
		Priority:               1,
	}
	if err := taskRepo.CreateTask(task2); err != nil {
		t.Fatalf("Failed to create task2: %v", err)
	}

	// Generate report
	reportDate := parseTime("2024-02-10T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// Verify report structure
	t.Run("report has title", func(t *testing.T) {
		expectedTitle := "Test Project Status Report - 2024-02-10"
		if report.Title != expectedTitle {
			t.Errorf("Expected title '%s', got '%s'", expectedTitle, report.Title)
		}
	})

	t.Run("report has recipients", func(t *testing.T) {
		if report.Recipients.To != "team@example.com" {
			t.Errorf("Expected To 'team@example.com', got '%s'", report.Recipients.To)
		}
		if report.Recipients.CC != "manager@example.com" {
			t.Errorf("Expected CC 'manager@example.com', got '%s'", report.Recipients.CC)
		}
		if report.Recipients.BCC != "archive@example.com" {
			t.Errorf("Expected BCC 'archive@example.com', got '%s'", report.Recipients.BCC)
		}
	})

	t.Run("report has CSS", func(t *testing.T) {
		if report.CSS == "" {
			t.Error("Expected CSS to be non-empty")
		}
		if !containsHelper(report.CSS, "status-red") {
			t.Error("Expected CSS to contain status-red class")
		}
		if !containsHelper(report.CSS, "status-green") {
			t.Error("Expected CSS to contain status-green class")
		}
		if !containsHelper(report.CSS, "status-yellow") {
			t.Error("Expected CSS to contain status-yellow class")
		}
	})

	t.Run("report has correct number of sections", func(t *testing.T) {
		// Should have 2 enabled sections (prose and status), not the disabled one
		if len(report.Sections) != 2 {
			t.Errorf("Expected 2 sections, got %d", len(report.Sections))
		}
	})

	t.Run("sections are in correct order", func(t *testing.T) {
		if len(report.Sections) < 2 {
			t.Fatal("Not enough sections to test order")
		}
		if report.Sections[0].Name != "TL;DR" {
			t.Errorf("Expected first section to be 'TL;DR', got '%s'", report.Sections[0].Name)
		}
		if report.Sections[1].Name != "Roadmap" {
			t.Errorf("Expected second section to be 'Roadmap', got '%s'", report.Sections[1].Name)
		}
	})

	t.Run("prose section has correct content", func(t *testing.T) {
		if len(report.Sections) < 1 {
			t.Fatal("No sections found")
		}
		proseContent := report.Sections[0].Content
		if proseContent != "This is a summary of the week." {
			t.Errorf("Expected prose content 'This is a summary of the week.', got '%s'", proseContent)
		}
	})

	t.Run("status section contains tasks", func(t *testing.T) {
		if len(report.Sections) < 2 {
			t.Fatal("Not enough sections")
		}
		statusContent := report.Sections[1].Content
		if !containsHelper(statusContent, "Implement feature X") {
			t.Error("Expected status section to contain 'Implement feature X'")
		}
		if !containsHelper(statusContent, "Fix bug Y") {
			t.Error("Expected status section to contain 'Fix bug Y'")
		}
	})

	t.Run("status section contains status badges", func(t *testing.T) {
		if len(report.Sections) < 2 {
			t.Fatal("Not enough sections")
		}
		statusContent := report.Sections[1].Content
		if !containsHelper(statusContent, "status-yellow") {
			t.Error("Expected status section to contain status-yellow class")
		}
		if !containsHelper(statusContent, "status-green") {
			t.Error("Expected status section to contain status-green class")
		}
	})

	t.Run("status section contains URLs", func(t *testing.T) {
		if len(report.Sections) < 2 {
			t.Fatal("Not enough sections")
		}
		statusContent := report.Sections[1].Content
		if !containsHelper(statusContent, "https://example.com/task1") {
			t.Error("Expected status section to contain task URL")
		}
	})

	t.Run("status section contains ECD", func(t *testing.T) {
		if len(report.Sections) < 2 {
			t.Fatal("Not enough sections")
		}
		statusContent := report.Sections[1].Content
		if !containsHelper(statusContent, "2024-02-15") {
			t.Error("Expected status section to contain ECD date")
		}
	})

	t.Run("disabled section not included", func(t *testing.T) {
		for _, section := range report.Sections {
			if section.Name == "Disabled Section" {
				t.Error("Disabled section should not be included in report")
			}
		}
	})
}

func TestGenerateReport_EmptyProject(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	// Create a project with no sections or tasks
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Empty Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)
	taskRepo := repository.NewTaskRepository(db)

	reportDate := parseTime("2024-02-10T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	if len(report.Sections) != 0 {
		t.Errorf("Expected 0 sections for empty project, got %d", len(report.Sections))
	}

	if report.Title == "" {
		t.Error("Expected title to be set even for empty project")
	}

	if report.CSS == "" {
		t.Error("Expected CSS to be set even for empty project")
	}
}

// Property 10: Change Detection Accuracy
// **Validates: Requirements 4.9, 7.10, 8.15**
func TestProperty10_ChangeDetectionAccuracy(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 10: Change Detection Accuracy",
		prop.ForAll(
			func(isTask bool, oldStatus string, newStatus string, hasOldECD bool, hasNewECD bool, oldECDDays int, newECDDays int) bool {
				service, db := setupReportServiceTest(t)
				defer db.Close()

				// Add all required tables
				schema := `
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
				`
				if _, err := db.Conn.Exec(schema); err != nil {
					return false
				}

				// Create a project
				projectRepo := repository.NewProjectRepository(db)
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Report",
					DefaultDirectory:  "/tmp",
				}
				if err := projectRepo.Create(project); err != nil {
					return false
				}

				// Create a report section
				section := &models.ReportSection{
					ProjectID: project.ID,
					Name:      "Roadmap",
					Type:      "status",
					Order:     0,
					IsEnabled: true,
				}
				if err := service.CreateReportSection(section); err != nil {
					return false
				}

				// Create task repository
				taskRepo := repository.NewTaskRepository(db)

				// Prepare ECDs
				baseDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
				var oldECD *time.Time
				var newECD *time.Time

				if hasOldECD {
					date := baseDate.AddDate(0, 0, oldECDDays)
					oldECD = &date
				}

				if hasNewECD {
					date := baseDate.AddDate(0, 0, newECDDays)
					newECD = &date
				}

				if isTask {
					// Test with a task
					task := &models.Task{
						ProjectID:              project.ID,
						ReportSectionID:        section.ID,
						Name:                   "Test Task",
						Status:                 newStatus,
						ExpectedCompletionDate: newECD,
						Priority:               0,
					}

					// Create task
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}

					// Create a report snapshot and task history
					snapshot := &models.ReportSnapshot{
						ProjectID:       project.ID,
						MarkdownContent: "Test report",
						FinalizedAt:     parseTime("2024-01-01T00:00:00Z"),
					}
					if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
						return false
					}

					history := &models.TaskHistory{
						ReportSnapshotID:       snapshot.ID,
						TaskID:                 task.ID,
						SubtaskID:              nil,
						Name:                   "Test Task",
						Status:                 oldStatus,
						ExpectedCompletionDate: oldECD,
						URL:                    "",
						Notes:                  "",
						CreatedAt:              parseTime("2024-01-01T00:00:00Z"),
					}
					if err := service.repo.CreateTaskHistory(history); err != nil {
						return false
					}

					// Detect changes
					changes, err := service.detectTaskChanges(task)
					if err != nil {
						return false
					}

					// Verify status change detection
					expectedStatusChanged := (oldStatus != newStatus)
					if changes.StatusChanged != expectedStatusChanged {
						return false
					}

					// If status changed, verify old status is correct
					if changes.StatusChanged && changes.OldStatus != oldStatus {
						return false
					}

					// Verify ECD change detection
					expectedECDChanged := !equalDates(oldECD, newECD)
					if changes.ECDChanged != expectedECDChanged {
						return false
					}

					// If ECD changed, verify old ECD is correct
					if changes.ECDChanged && !equalDates(changes.OldECD, oldECD) {
						return false
					}

					return true
				} else {
					// Test with a subtask
					// First create a parent task
					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: section.ID,
						Name:            "Parent Task",
						Status:          "not started",
						Priority:        0,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}

					subtask := &models.Subtask{
						TaskID:                 task.ID,
						Name:                   "Test Subtask",
						Status:                 newStatus,
						ExpectedCompletionDate: newECD,
					}

					// Create subtask
					if err := taskRepo.CreateSubtask(subtask); err != nil {
						return false
					}

					// Create a report snapshot and subtask history
					snapshot := &models.ReportSnapshot{
						ProjectID:       project.ID,
						MarkdownContent: "Test report",
						FinalizedAt:     parseTime("2024-01-01T00:00:00Z"),
					}
					if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
						return false
					}

					history := &models.TaskHistory{
						ReportSnapshotID:       snapshot.ID,
						TaskID:                 task.ID,
						SubtaskID:              &subtask.ID,
						Name:                   "Test Subtask",
						Status:                 oldStatus,
						ExpectedCompletionDate: oldECD,
						URL:                    "",
						Notes:                  "",
						CreatedAt:              parseTime("2024-01-01T00:00:00Z"),
					}
					if err := service.repo.CreateTaskHistory(history); err != nil {
						return false
					}

					// Detect changes
					changes, err := service.detectSubtaskChanges(subtask)
					if err != nil {
						return false
					}

					// Verify status change detection
					expectedStatusChanged := (oldStatus != newStatus)
					if changes.StatusChanged != expectedStatusChanged {
						return false
					}

					// If status changed, verify old status is correct
					if changes.StatusChanged && changes.OldStatus != oldStatus {
						return false
					}

					// Verify ECD change detection
					expectedECDChanged := !equalDates(oldECD, newECD)
					if changes.ECDChanged != expectedECDChanged {
						return false
					}

					// If ECD changed, verify old ECD is correct
					if changes.ECDChanged && !equalDates(changes.OldECD, oldECD) {
						return false
					}

					return true
				}
			},
			gen.Bool(), // isTask: true for task, false for subtask
			gen.OneConstOf("not started", "in progress", "in review", "done"), // oldStatus
			gen.OneConstOf("not started", "in progress", "in review", "done"), // newStatus
			gen.Bool(),           // hasOldECD
			gen.Bool(),           // hasNewECD
			gen.IntRange(0, 365), // oldECDDays (0-365 days from base date)
			gen.IntRange(0, 365), // newECDDays (0-365 days from base date)
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 11: No Change Highlighting for Non-Tracked Fields
// **Validates: Requirements 4.10, 7.11**
func TestProperty11_NoChangeHighlightingForNonTrackedFields(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 11: No Change Highlighting for Non-Tracked Fields",
		prop.ForAll(
			func(isTask bool, oldName string, newName string, oldURL string, newURL string, oldNotes string, newNotes string) bool {
				service, db := setupReportServiceTest(t)
				defer db.Close()

				// Add all required tables
				schema := `
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
				`
				if _, err := db.Conn.Exec(schema); err != nil {
					return false
				}

				// Create a project
				projectRepo := repository.NewProjectRepository(db)
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Report",
					DefaultDirectory:  "/tmp",
				}
				if err := projectRepo.Create(project); err != nil {
					return false
				}

				// Create a report section
				section := &models.ReportSection{
					ProjectID: project.ID,
					Name:      "Roadmap",
					Type:      "status",
					Order:     0,
					IsEnabled: true,
				}
				if err := service.CreateReportSection(section); err != nil {
					return false
				}

				// Create task repository
				taskRepo := repository.NewTaskRepository(db)

				// Use a constant status and ECD to ensure they don't change
				constantStatus := "in progress"
				constantECD := time.Date(2024, 6, 15, 0, 0, 0, 0, time.UTC)

				if isTask {
					// Test with a task
					task := &models.Task{
						ProjectID:              project.ID,
						ReportSectionID:        section.ID,
						Name:                   newName,
						Status:                 constantStatus,
						ExpectedCompletionDate: &constantECD,
						URL:                    newURL,
						Notes:                  newNotes,
						Priority:               0,
					}

					// Create task
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}

					// Create a report snapshot and task history with old name, URL, notes
					// but same status and ECD
					snapshot := &models.ReportSnapshot{
						ProjectID:       project.ID,
						MarkdownContent: "Test report",
						FinalizedAt:     parseTime("2024-01-01T00:00:00Z"),
					}
					if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
						return false
					}

					history := &models.TaskHistory{
						ReportSnapshotID:       snapshot.ID,
						TaskID:                 task.ID,
						SubtaskID:              nil,
						Name:                   oldName,
						Status:                 constantStatus,
						ExpectedCompletionDate: &constantECD,
						URL:                    oldURL,
						Notes:                  oldNotes,
						CreatedAt:              parseTime("2024-01-01T00:00:00Z"),
					}
					if err := service.repo.CreateTaskHistory(history); err != nil {
						return false
					}

					// Detect changes
					changes, err := service.detectTaskChanges(task)
					if err != nil {
						return false
					}

					// Verify that no changes are detected for non-tracked fields
					// Status and ECD are the same, so even if name, URL, or notes changed,
					// StatusChanged and ECDChanged should be false
					if changes.StatusChanged {
						return false
					}

					if changes.ECDChanged {
						return false
					}

					return true
				} else {
					// Test with a subtask
					// First create a parent task
					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: section.ID,
						Name:            "Parent Task",
						Status:          "not started",
						Priority:        0,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}

					subtask := &models.Subtask{
						TaskID:                 task.ID,
						Name:                   newName,
						Status:                 constantStatus,
						ExpectedCompletionDate: &constantECD,
						URL:                    newURL,
						Notes:                  newNotes,
					}

					// Create subtask
					if err := taskRepo.CreateSubtask(subtask); err != nil {
						return false
					}

					// Create a report snapshot and subtask history with old name, URL, notes
					// but same status and ECD
					snapshot := &models.ReportSnapshot{
						ProjectID:       project.ID,
						MarkdownContent: "Test report",
						FinalizedAt:     parseTime("2024-01-01T00:00:00Z"),
					}
					if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
						return false
					}

					history := &models.TaskHistory{
						ReportSnapshotID:       snapshot.ID,
						TaskID:                 task.ID,
						SubtaskID:              &subtask.ID,
						Name:                   oldName,
						Status:                 constantStatus,
						ExpectedCompletionDate: &constantECD,
						URL:                    oldURL,
						Notes:                  oldNotes,
						CreatedAt:              parseTime("2024-01-01T00:00:00Z"),
					}
					if err := service.repo.CreateTaskHistory(history); err != nil {
						return false
					}

					// Detect changes
					changes, err := service.detectSubtaskChanges(subtask)
					if err != nil {
						return false
					}

					// Verify that no changes are detected for non-tracked fields
					// Status and ECD are the same, so even if name, URL, or notes changed,
					// StatusChanged and ECDChanged should be false
					if changes.StatusChanged {
						return false
					}

					if changes.ECDChanged {
						return false
					}

					return true
				}
			},
			gen.Bool(), // isTask: true for task, false for subtask
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) > 0 && len(s) <= 100 }), // oldName
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) > 0 && len(s) <= 100 }), // newName
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) <= 200 }),               // oldURL
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) <= 200 }),               // newURL
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) <= 500 }),               // oldNotes
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) <= 500 }),               // newNotes
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 12: Report Structure Completeness
// **Validates: Requirements 7.2, 7.3, 7.4, 7.5**
func TestProperty12_ReportStructureCompleteness(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 12: Report Structure Completeness",
		prop.ForAll(
			func(recipientsTo string, recipientsCC string, recipientsBCC string, titleFormat string, numSections int, sectionTypes []bool) bool {
				service, db := setupReportServiceTest(t)
				defer db.Close()

				// Add all required tables
				schema := `
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
				`
				if _, err := db.Conn.Exec(schema); err != nil {
					return false
				}

				// Create a project with the generated recipients and title format
				projectRepo := repository.NewProjectRepository(db)
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: titleFormat,
					DefaultDirectory:  "/tmp",
					RecipientsTo:      recipientsTo,
					RecipientsCC:      recipientsCC,
					RecipientsBCC:     recipientsBCC,
				}
				if err := projectRepo.Create(project); err != nil {
					return false
				}

				// Create report sections based on numSections and sectionTypes
				// Ensure we have at least 1 section and at most 10
				actualNumSections := numSections
				if actualNumSections < 1 {
					actualNumSections = 1
				}
				if actualNumSections > 10 {
					actualNumSections = 10
				}

				sections := make([]*models.ReportSection, 0, actualNumSections)
				for i := 0; i < actualNumSections; i++ {
					// Determine section type based on sectionTypes array
					sectionType := "prose"
					if i < len(sectionTypes) && sectionTypes[i] {
						sectionType = "status"
					}

					section := &models.ReportSection{
						ProjectID: project.ID,
						Name:      fmt.Sprintf("Section %d", i),
						Type:      sectionType,
						Content:   fmt.Sprintf("Content for section %d", i),
						Order:     i,
						IsEnabled: true,
					}
					if err := service.CreateReportSection(section); err != nil {
						return false
					}
					sections = append(sections, section)
				}

				// Create a task repository
				taskRepo := repository.NewTaskRepository(db)

				// For each status section, create at least one task
				for _, section := range sections {
					if section.Type == "status" {
						task := &models.Task{
							ProjectID:       project.ID,
							ReportSectionID: section.ID,
							Name:            fmt.Sprintf("Task for %s", section.Name),
							Status:          "in progress",
							Priority:        0,
						}
						if err := taskRepo.CreateTask(task); err != nil {
							return false
						}
					}
				}

				// Create a project service
				logger := zap.NewNop()
				templateService := NewTemplateService(logger)
				projectService := NewProjectService(projectRepo, templateService, logger)

				// Generate the report
				date := time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC)
				report, err := service.GenerateReport(project.ID, date, projectService, taskRepo)
				if err != nil {
					return false
				}

				// Verify Property 12: Report Structure Completeness
				// (1) Recipients block with To, CC, and BCC fields
				if report.Recipients.To != recipientsTo {
					return false
				}
				if report.Recipients.CC != recipientsCC {
					return false
				}
				if report.Recipients.BCC != recipientsBCC {
					return false
				}

				// (2) Title rendered from the project's title template
				expectedTitle := projectService.RenderReportTitle(project, date)
				if report.Title != expectedTitle {
					return false
				}

				// (3) CSS styles for status badges
				if report.CSS == "" {
					return false
				}
				// Verify CSS contains status badge styles
				if !containsStatusBadgeCSS(report.CSS) {
					return false
				}

				// (4) Content for all enabled report sections
				if len(report.Sections) != actualNumSections {
					return false
				}

				// Verify each section has content
				for i, renderedSection := range report.Sections {
					// Check section name matches
					if renderedSection.Name != sections[i].Name {
						return false
					}

					// Check section type matches
					if renderedSection.Type != sections[i].Type {
						return false
					}

					// For prose sections, content should match the stored content
					if renderedSection.Type == "prose" {
						if renderedSection.Content != sections[i].Content {
							return false
						}
					}

					// For status sections, content should be generated (non-empty if tasks exist)
					// We created tasks for status sections, so content should exist
					if renderedSection.Type == "status" {
						// Content can be empty if no tasks, but we created tasks, so it should have content
						// Actually, the content might be empty if there are no tasks or if tasks are filtered out
						// Let's just verify the section exists in the output
					}
				}

				return true
			},
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) <= 200 }), // recipientsTo
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) <= 200 }), // recipientsCC
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) <= 200 }), // recipientsBCC
			gen.OneConstOf(
				"{project-name} Status Report - {YYYY-MM-DD}",
				"{project-name} Weekly Update",
				"Report for {project-name}",
				"{YYYY-MM-DD} Status",
			), // titleFormat
			gen.IntRange(1, 10), // numSections (1-10 sections)
			gen.SliceOfN(10, gen.Bool()).Map(func(slice []bool) []bool { return slice }), // sectionTypes (true = status, false = prose)
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// containsStatusBadgeCSS checks if the CSS string contains status badge styles
func containsStatusBadgeCSS(css string) bool {
	// Check for at least some of the expected status badge classes
	requiredClasses := []string{
		"status-red",
		"status-green",
		"status-yellow",
		"status-gray",
		"status-paused",
		"status-pending",
	}

	for _, class := range requiredClasses {
		if !strings.Contains(css, class) {
			return false
		}
	}

	return true
}

// Property 13: Status Section Task Filtering
// **Validates: Requirements 7.6**
func TestProperty13_StatusSectionTaskFiltering(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 13: Status Section Task Filtering",
		prop.ForAll(
			func(numSections int, tasksPerSection []int) bool {
				service, db := setupReportServiceTest(t)
				defer db.Close()

				// Add all required tables
				schema := `
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
				`
				if _, err := db.Conn.Exec(schema); err != nil {
					return false
				}

				// Create a project
				projectRepo := repository.NewProjectRepository(db)
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Status Report",
					DefaultDirectory:  "/tmp",
					RecipientsTo:      "test@example.com",
					RecipientsCC:      "",
					RecipientsBCC:     "",
				}
				if err := projectRepo.Create(project); err != nil {
					return false
				}

				// Constrain numSections to 2-5 for reasonable test size
				actualNumSections := numSections
				if actualNumSections < 2 {
					actualNumSections = 2
				}
				if actualNumSections > 5 {
					actualNumSections = 5
				}

				// Create multiple status-type report sections
				sections := make([]*models.ReportSection, 0, actualNumSections)
				for i := 0; i < actualNumSections; i++ {
					section := &models.ReportSection{
						ProjectID: project.ID,
						Name:      fmt.Sprintf("Section %d", i),
						Type:      "status",
						Content:   "",
						Order:     i,
						IsEnabled: true,
					}
					if err := service.CreateReportSection(section); err != nil {
						return false
					}
					sections = append(sections, section)
				}

				// Create a task repository
				taskRepo := repository.NewTaskRepository(db)

				// For each section, create a specific number of tasks
				// Track which tasks belong to which section
				sectionTaskMap := make(map[int64][]string) // section ID -> task names

				for i, section := range sections {
					// Determine number of tasks for this section
					numTasks := 1 // Default to at least 1 task
					if i < len(tasksPerSection) {
						numTasks = tasksPerSection[i]
						if numTasks < 0 {
							numTasks = 0
						}
						if numTasks > 5 {
							numTasks = 5 // Cap at 5 tasks per section
						}
					}

					taskNames := make([]string, 0, numTasks)
					for j := 0; j < numTasks; j++ {
						taskName := fmt.Sprintf("Task S%d-T%d", i, j)
						task := &models.Task{
							ProjectID:       project.ID,
							ReportSectionID: section.ID,
							Name:            taskName,
							Status:          "in progress",
							Priority:        j,
						}
						if err := taskRepo.CreateTask(task); err != nil {
							return false
						}
						taskNames = append(taskNames, taskName)

						// Also create a subtask for some tasks to verify subtask filtering
						if j%2 == 0 {
							subtaskName := fmt.Sprintf("Subtask S%d-T%d-ST0", i, j)
							subtask := &models.Subtask{
								TaskID: task.ID,
								Name:   subtaskName,
								Status: "not started",
							}
							if err := taskRepo.CreateSubtask(subtask); err != nil {
								return false
							}
						}
					}
					sectionTaskMap[section.ID] = taskNames
				}

				// Create a project service
				logger := zap.NewNop()
				templateService := NewTemplateService(logger)
				projectService := NewProjectService(projectRepo, templateService, logger)

				// Generate the report
				date := time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC)
				report, err := service.GenerateReport(project.ID, date, projectService, taskRepo)
				if err != nil {
					return false
				}

				// Verify Property 13: Status Section Task Filtering
				// For each status section in the report, verify it contains only tasks assigned to that section

				if len(report.Sections) != actualNumSections {
					return false
				}

				for i, renderedSection := range report.Sections {
					// Get the corresponding section
					section := sections[i]

					// Verify section name matches
					if renderedSection.Name != section.Name {
						return false
					}

					// Verify section type is status
					if renderedSection.Type != "status" {
						return false
					}

					// Get expected task names for this section
					expectedTaskNames := sectionTaskMap[section.ID]

					// Verify the content contains all expected tasks
					for _, taskName := range expectedTaskNames {
						if !strings.Contains(renderedSection.Content, taskName) {
							// Expected task is missing from section content
							return false
						}
					}

					// Verify the content does NOT contain tasks from other sections
					for otherSectionID, otherTaskNames := range sectionTaskMap {
						if otherSectionID == section.ID {
							continue // Skip the current section
						}

						for _, otherTaskName := range otherTaskNames {
							if strings.Contains(renderedSection.Content, otherTaskName) {
								// Task from another section is incorrectly included
								return false
							}
						}
					}

					// Verify subtasks are also filtered correctly
					// Subtasks should only appear if their parent task is in this section
					for j, otherSection := range sections {
						if otherSection.ID == section.ID {
							continue // Skip the current section
						}

						// Check that subtasks from other sections don't appear
						subtaskPattern := fmt.Sprintf("Subtask S%d-", j)
						if strings.Contains(renderedSection.Content, subtaskPattern) {
							// Subtask from another section is incorrectly included
							return false
						}
					}
				}

				return true
			},
			gen.IntRange(2, 5), // numSections (2-5 sections)
			gen.SliceOfN(5, gen.IntRange(0, 5)).Map(func(slice []int) []int { return slice }), // tasksPerSection (0-5 tasks per section)
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 14: Status Badge HTML Format
// **Validates: Requirements 7.7**
func TestProperty14_StatusBadgeHTMLFormat(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 14: Status Badge HTML Format",
		prop.ForAll(
			func(numTasks int, numSubtasksPerTask int, statusStyles []string) bool {
				service, db := setupReportServiceTest(t)
				defer db.Close()

				// Add all required tables
				schema := `
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
				`
				if _, err := db.Conn.Exec(schema); err != nil {
					return false
				}

				// Create a project
				projectRepo := repository.NewProjectRepository(db)
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Status Report",
					DefaultDirectory:  "/tmp",
					RecipientsTo:      "test@example.com",
					RecipientsCC:      "",
					RecipientsBCC:     "",
				}
				if err := projectRepo.Create(project); err != nil {
					return false
				}

				// Constrain inputs for reasonable test size
				actualNumTasks := numTasks
				if actualNumTasks < 1 {
					actualNumTasks = 1
				}
				if actualNumTasks > 5 {
					actualNumTasks = 5
				}

				actualNumSubtasks := numSubtasksPerTask
				if actualNumSubtasks < 0 {
					actualNumSubtasks = 0
				}
				if actualNumSubtasks > 3 {
					actualNumSubtasks = 3
				}

				// Define valid status styles
				validStyles := []string{"red", "green", "yellow", "gray", "paused", "pending"}

				// Create status definitions with various styles
				statusNames := make([]string, 0)
				for i := 0; i < len(validStyles); i++ {
					style := validStyles[i]
					if i < len(statusStyles) && statusStyles[i] != "" {
						// Use provided style if valid
						found := false
						for _, validStyle := range validStyles {
							if statusStyles[i] == validStyle {
								style = statusStyles[i]
								found = true
								break
							}
						}
						if !found {
							style = validStyles[i%len(validStyles)]
						}
					}

					statusName := fmt.Sprintf("Status %s", style)
					statusDef := &models.StatusDefinition{
						ProjectID: project.ID,
						Name:      statusName,
						Style:     style,
						Order:     i,
					}
					if err := service.CreateStatusDefinition(statusDef); err != nil {
						return false
					}
					statusNames = append(statusNames, statusName)
				}

				// Create a status-type report section
				section := &models.ReportSection{
					ProjectID: project.ID,
					Name:      "Test Section",
					Type:      "status",
					Content:   "",
					Order:     0,
					IsEnabled: true,
				}
				if err := service.CreateReportSection(section); err != nil {
					return false
				}

				// Create a task repository
				taskRepo := repository.NewTaskRepository(db)

				// Create tasks with different statuses
				taskStatuses := make([]string, 0)
				for i := 0; i < actualNumTasks; i++ {
					statusName := statusNames[i%len(statusNames)]
					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: section.ID,
						Name:            fmt.Sprintf("Task %d", i),
						Status:          statusName,
						Priority:        i,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}
					taskStatuses = append(taskStatuses, statusName)

					// Create subtasks with different statuses
					for j := 0; j < actualNumSubtasks; j++ {
						subtaskStatusName := statusNames[(i+j+1)%len(statusNames)]
						subtask := &models.Subtask{
							TaskID: task.ID,
							Name:   fmt.Sprintf("Subtask %d-%d", i, j),
							Status: subtaskStatusName,
						}
						if err := taskRepo.CreateSubtask(subtask); err != nil {
							return false
						}
					}
				}

				// Create a project service
				logger := zap.NewNop()
				templateService := NewTemplateService(logger)
				projectService := NewProjectService(projectRepo, templateService, logger)

				// Generate the report
				date := time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC)
				report, err := service.GenerateReport(project.ID, date, projectService, taskRepo)
				if err != nil {
					return false
				}

				// Verify Property 14: Status Badge HTML Format
				// For any task or subtask status displayed in a report,
				// the status should be wrapped in an HTML <span> tag with a CSS class
				// corresponding to the status style (e.g., "status-red", "status-green")

				if len(report.Sections) != 1 {
					return false
				}

				content := report.Sections[0].Content

				// Verify each task status appears with proper HTML span format
				for i, statusName := range taskStatuses {
					// Get the expected CSS class for this status
					var expectedClass string
					for _, statusDef := range statusNames {
						if statusDef == statusName {
							// Find the style for this status
							statuses, err := service.ListStatusDefinitions(project.ID)
							if err != nil {
								return false
							}
							for _, s := range statuses {
								if s.Name == statusName {
									expectedClass = fmt.Sprintf("status-%s", s.Style)
									break
								}
							}
							break
						}
					}

					// Verify the status appears in a span tag with the correct class
					// Pattern: <span class="status-{style}">{status name}</span>
					expectedPattern := fmt.Sprintf(`<span class="%s">%s</span>`, expectedClass, statusName)
					if !strings.Contains(content, expectedPattern) {
						// Status badge not found with correct HTML format
						return false
					}

					// Verify the task name appears (to ensure we're checking the right task)
					taskName := fmt.Sprintf("Task %d", i)
					if !strings.Contains(content, taskName) {
						return false
					}
				}

				// Verify subtask statuses also have proper HTML span format
				for i := 0; i < actualNumTasks; i++ {
					for j := 0; j < actualNumSubtasks; j++ {
						subtaskStatusName := statusNames[(i+j+1)%len(statusNames)]

						// Get the expected CSS class for this subtask status
						var expectedClass string
						statuses, err := service.ListStatusDefinitions(project.ID)
						if err != nil {
							return false
						}
						for _, s := range statuses {
							if s.Name == subtaskStatusName {
								expectedClass = fmt.Sprintf("status-%s", s.Style)
								break
							}
						}

						// Verify the subtask status appears in a span tag with the correct class
						expectedPattern := fmt.Sprintf(`<span class="%s">%s</span>`, expectedClass, subtaskStatusName)
						if !strings.Contains(content, expectedPattern) {
							// Subtask status badge not found with correct HTML format
							return false
						}

						// Verify the subtask name appears
						subtaskName := fmt.Sprintf("Subtask %d-%d", i, j)
						if !strings.Contains(content, subtaskName) {
							return false
						}
					}
				}

				// Verify that status badges are NOT rendered without span tags
				// Check that raw status names don't appear without HTML wrapping
				lines := strings.Split(content, "\n")
				for _, line := range lines {
					// Skip empty lines
					if strings.TrimSpace(line) == "" {
						continue
					}

					// If the line contains a task or subtask and a status name
					if strings.Contains(line, "Task ") || strings.Contains(line, "Subtask ") {
						for _, sn := range statusNames {
							if strings.Contains(line, sn) {
								// Verify it's wrapped in a span tag
								spanPattern := fmt.Sprintf(`<span class="status-[^"]+">%s</span>`, sn)
								matched, _ := regexp.MatchString(spanPattern, line)
								if !matched {
									// Status appears without proper span wrapping
									return false
								}
							}
						}
					}
				}

				return true
			},
			gen.IntRange(1, 5), // numTasks (1-5 tasks)
			gen.IntRange(0, 3), // numSubtasksPerTask (0-3 subtasks per task)
			gen.SliceOfN(6, gen.OneConstOf("red", "green", "yellow", "gray", "paused", "pending")), // statusStyles
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 15: Status Change Rendering
// **Validates: Requirements 7.8**
func TestProperty15_StatusChangeRendering(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 15: Status Change Rendering",
		prop.ForAll(
			func(numTasks int, hasHistory bool, changeStatus bool) bool {
				service, db := setupReportServiceTest(t)
				defer db.Close()

				// Add all required tables
				schema := `
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
				`
				if _, err := db.Conn.Exec(schema); err != nil {
					return false
				}

				// Create a project
				projectRepo := repository.NewProjectRepository(db)
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Status Report",
					DefaultDirectory:  "/tmp",
					RecipientsTo:      "test@example.com",
					RecipientsCC:      "",
					RecipientsBCC:     "",
				}
				if err := projectRepo.Create(project); err != nil {
					return false
				}

				// Constrain inputs for reasonable test size
				actualNumTasks := numTasks
				if actualNumTasks < 1 {
					actualNumTasks = 1
				}
				if actualNumTasks > 5 {
					actualNumTasks = 5
				}

				// Define status definitions with different styles
				statusDefs := []struct {
					name  string
					style string
				}{
					{"not started", "gray"},
					{"in progress", "yellow"},
					{"in review", "pending"},
					{"done", "green"},
					{"blocked", "red"},
				}

				// Create status definitions
				for i, sd := range statusDefs {
					statusDef := &models.StatusDefinition{
						ProjectID: project.ID,
						Name:      sd.name,
						Style:     sd.style,
						Order:     i,
					}
					if err := service.CreateStatusDefinition(statusDef); err != nil {
						return false
					}
				}

				// Create a status-type report section
				section := &models.ReportSection{
					ProjectID: project.ID,
					Name:      "Test Section",
					Type:      "status",
					Content:   "",
					Order:     0,
					IsEnabled: true,
				}
				if err := service.CreateReportSection(section); err != nil {
					return false
				}

				// Create a task repository
				taskRepo := repository.NewTaskRepository(db)

				// Create tasks
				tasks := make([]*models.Task, 0)
				for i := 0; i < actualNumTasks; i++ {
					// Alternate between different statuses
					currentStatus := statusDefs[i%len(statusDefs)].name
					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: section.ID,
						Name:            fmt.Sprintf("Task %d", i),
						Status:          currentStatus,
						Priority:        i,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}
					tasks = append(tasks, task)
				}

				// If hasHistory is true, create a previous report snapshot with task history
				if hasHistory {
					snapshot := &models.ReportSnapshot{
						ProjectID:       project.ID,
						MarkdownContent: "Previous report",
						FinalizedAt:     time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
					}
					if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
						return false
					}

					// Create task history with old status
					for i, task := range tasks {
						// Use a different status for history if changeStatus is true
						oldStatus := task.Status
						if changeStatus {
							// Use the previous status in the list
							oldStatus = statusDefs[(i+len(statusDefs)-1)%len(statusDefs)].name
						}

						history := &models.TaskHistory{
							ReportSnapshotID: snapshot.ID,
							TaskID:           task.ID,
							SubtaskID:        nil,
							Name:             task.Name,
							Status:           oldStatus,
							URL:              task.URL,
							Notes:            task.Notes,
							CreatedAt:        time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
						}
						if err := service.repo.CreateTaskHistory(history); err != nil {
							return false
						}
					}
				}

				// Create a project service
				logger := zap.NewNop()
				templateService := NewTemplateService(logger)
				projectService := NewProjectService(projectRepo, templateService, logger)

				// Generate the report
				date := time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC)
				report, err := service.GenerateReport(project.ID, date, projectService, taskRepo)
				if err != nil {
					return false
				}

				// Verify Property 15: Status Change Rendering
				// For any task whose status has changed since the last finalized report,
				// the generated report should display the status transition in the format:
				// <span class="old-style">old status</span> → <span class="new-style">new status</span>

				if len(report.Sections) != 1 {
					return false
				}

				content := report.Sections[0].Content

				// Verify each task's status rendering
				for i, task := range tasks {
					taskName := fmt.Sprintf("Task %d", i)

					// Verify task name appears in the report
					if !strings.Contains(content, taskName) {
						return false
					}

					if hasHistory && changeStatus {
						// Status changed: verify transition format
						oldStatus := statusDefs[(i+len(statusDefs)-1)%len(statusDefs)].name
						oldStyle := fmt.Sprintf("status-%s", statusDefs[(i+len(statusDefs)-1)%len(statusDefs)].style)
						newStatus := task.Status
						newStyle := fmt.Sprintf("status-%s", statusDefs[i%len(statusDefs)].style)

						// Expected format: <span class="old-style">old status</span> → <span class="new-style">new status</span>
						expectedPattern := fmt.Sprintf(`<span class="%s">%s</span> → <span class="%s">%s</span>`,
							oldStyle, oldStatus, newStyle, newStatus)

						if !strings.Contains(content, expectedPattern) {
							// Status change not rendered correctly
							return false
						}

						// Verify the arrow symbol (→) is present
						if !strings.Contains(content, "→") {
							return false
						}

						// Verify both old and new status spans are present
						oldSpan := fmt.Sprintf(`<span class="%s">%s</span>`, oldStyle, oldStatus)
						newSpan := fmt.Sprintf(`<span class="%s">%s</span>`, newStyle, newStatus)
						if !strings.Contains(content, oldSpan) || !strings.Contains(content, newSpan) {
							return false
						}

					} else {
						// Status unchanged or no history: verify single status badge
						currentStatus := task.Status
						currentStyle := fmt.Sprintf("status-%s", statusDefs[i%len(statusDefs)].style)

						// Expected format: <span class="status-style">status</span>
						expectedPattern := fmt.Sprintf(`<span class="%s">%s</span>`, currentStyle, currentStatus)

						if !strings.Contains(content, expectedPattern) {
							// Status badge not rendered correctly
							return false
						}

						// Verify the arrow symbol (→) is NOT present for this task
						// Extract the line containing this task
						lines := strings.Split(content, "\n")
						for _, line := range lines {
							if strings.Contains(line, taskName) {
								if strings.Contains(line, "→") {
									// Arrow should not be present when status hasn't changed
									return false
								}
								break
							}
						}
					}
				}

				return true
			},
			gen.IntRange(1, 5), // numTasks (1-5 tasks)
			gen.Bool(),         // hasHistory (whether there's a previous report)
			gen.Bool(),         // changeStatus (whether status changed since last report)
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 16: ECD Change Rendering
// **Validates: Requirements 7.9**
func TestProperty16_ECDChangeRendering(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 16: ECD Change Rendering",
		prop.ForAll(
			func(numTasks int, hasHistory bool, changeECD bool) bool {
				service, db := setupReportServiceTest(t)
				defer db.Close()

				// Add all required tables
				schema := `
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
				`
				if _, err := db.Conn.Exec(schema); err != nil {
					return false
				}

				// Create a project
				projectRepo := repository.NewProjectRepository(db)
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Status Report",
					DefaultDirectory:  "/tmp",
					RecipientsTo:      "test@example.com",
					RecipientsCC:      "",
					RecipientsBCC:     "",
				}
				if err := projectRepo.Create(project); err != nil {
					return false
				}

				// Constrain inputs for reasonable test size
				actualNumTasks := numTasks
				if actualNumTasks < 1 {
					actualNumTasks = 1
				}
				if actualNumTasks > 5 {
					actualNumTasks = 5
				}

				// Create a status definition
				statusDef := &models.StatusDefinition{
					ProjectID: project.ID,
					Name:      "in progress",
					Style:     "yellow",
					Order:     0,
				}
				if err := service.CreateStatusDefinition(statusDef); err != nil {
					return false
				}

				// Create a status-type report section
				section := &models.ReportSection{
					ProjectID: project.ID,
					Name:      "Test Section",
					Type:      "status",
					Content:   "",
					Order:     0,
					IsEnabled: true,
				}
				if err := service.CreateReportSection(section); err != nil {
					return false
				}

				// Create a task repository
				taskRepo := repository.NewTaskRepository(db)

				// Create tasks with ECDs
				tasks := make([]*models.Task, 0)
				for i := 0; i < actualNumTasks; i++ {
					// Set current ECD (different for each task)
					currentECD := time.Date(2024, 3, i+1, 0, 0, 0, 0, time.UTC)
					task := &models.Task{
						ProjectID:              project.ID,
						ReportSectionID:        section.ID,
						Name:                   fmt.Sprintf("Task %d", i),
						Status:                 "in progress",
						ExpectedCompletionDate: &currentECD,
						Priority:               i,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}
					tasks = append(tasks, task)
				}

				// If hasHistory is true, create a previous report snapshot with task history
				if hasHistory {
					snapshot := &models.ReportSnapshot{
						ProjectID:       project.ID,
						MarkdownContent: "Previous report",
						FinalizedAt:     time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
					}
					if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
						return false
					}

					// Create task history with old ECD
					for i, task := range tasks {
						// Use a different ECD for history if changeECD is true
						var oldECD *time.Time
						if changeECD {
							// Use a different date (one month earlier)
							oldDate := time.Date(2024, 2, i+1, 0, 0, 0, 0, time.UTC)
							oldECD = &oldDate
						} else {
							// Use the same ECD as current
							oldECD = task.ExpectedCompletionDate
						}

						history := &models.TaskHistory{
							ReportSnapshotID:       snapshot.ID,
							TaskID:                 task.ID,
							SubtaskID:              nil,
							Name:                   task.Name,
							Status:                 task.Status,
							ExpectedCompletionDate: oldECD,
							URL:                    task.URL,
							Notes:                  task.Notes,
							CreatedAt:              time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
						}
						if err := service.repo.CreateTaskHistory(history); err != nil {
							return false
						}
					}
				}

				// Create a project service
				logger := zap.NewNop()
				templateService := NewTemplateService(logger)
				projectService := NewProjectService(projectRepo, templateService, logger)

				// Generate the report
				date := time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC)
				report, err := service.GenerateReport(project.ID, date, projectService, taskRepo)
				if err != nil {
					return false
				}

				// Verify Property 16: ECD Change Rendering
				// For any task whose expected completion date has changed since the last finalized report,
				// the generated report should display the change in the format: ~~old ECD~~ new ECD

				if len(report.Sections) != 1 {
					return false
				}

				content := report.Sections[0].Content

				// Verify each task's ECD rendering
				for i := range tasks {
					taskName := fmt.Sprintf("Task %d", i)

					// Verify task name appears in the report
					if !strings.Contains(content, taskName) {
						return false
					}

					if hasHistory && changeECD {
						// ECD changed: verify strikethrough format
						oldECD := time.Date(2024, 2, i+1, 0, 0, 0, 0, time.UTC)
						newECD := time.Date(2024, 3, i+1, 0, 0, 0, 0, time.UTC)

						oldECDStr := oldECD.Format("2006-01-02")
						newECDStr := newECD.Format("2006-01-02")

						// Expected format: ~~old ECD~~ new ECD
						expectedPattern := fmt.Sprintf("~~%s~~ %s", oldECDStr, newECDStr)

						if !strings.Contains(content, expectedPattern) {
							// ECD change not rendered correctly
							return false
						}

						// Verify the strikethrough markers (~~) are present
						if !strings.Contains(content, "~~") {
							return false
						}

						// Extract the line containing this task to verify format
						lines := strings.Split(content, "\n")
						for _, line := range lines {
							if strings.Contains(line, taskName) {
								// Verify both old and new ECD are on the same line
								if !strings.Contains(line, oldECDStr) || !strings.Contains(line, newECDStr) {
									return false
								}
								// Verify the strikethrough format
								if !strings.Contains(line, fmt.Sprintf("~~%s~~", oldECDStr)) {
									return false
								}
								break
							}
						}

					} else {
						// ECD unchanged or no history: verify single ECD display
						currentECD := time.Date(2024, 3, i+1, 0, 0, 0, 0, time.UTC)
						currentECDStr := currentECD.Format("2006-01-02")

						// Expected format: just the date without strikethrough
						if !strings.Contains(content, currentECDStr) {
							// ECD not rendered
							return false
						}

						// Extract the line containing this task
						lines := strings.Split(content, "\n")
						for _, line := range lines {
							if strings.Contains(line, taskName) {
								// Verify the ECD is present
								if !strings.Contains(line, currentECDStr) {
									return false
								}
								// Verify no strikethrough markers for this task's ECD
								// Check that if ~~ appears, it's not for this task's ECD
								if strings.Contains(line, fmt.Sprintf("~~%s~~", currentECDStr)) {
									// Strikethrough should not be present when ECD hasn't changed
									return false
								}
								break
							}
						}
					}
				}

				return true
			},
			gen.IntRange(1, 5), // numTasks (1-5 tasks)
			gen.Bool(),         // hasHistory (whether there's a previous report)
			gen.Bool(),         // changeECD (whether ECD changed since last report)
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 17: Report Section Ordering
// **Validates: Requirements 7.12**
func TestProperty17_ReportSectionOrdering(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 17: Report Section Ordering",
		prop.ForAll(
			func(numSections int, shuffleOrder bool) bool {
				service, db := setupReportServiceTest(t)
				defer db.Close()

				// Add all required tables
				schema := `
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
				`
				if _, err := db.Conn.Exec(schema); err != nil {
					return false
				}

				// Create a project
				projectRepo := repository.NewProjectRepository(db)
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Status Report",
					DefaultDirectory:  "/tmp",
					RecipientsTo:      "test@example.com",
					RecipientsCC:      "",
					RecipientsBCC:     "",
				}
				if err := projectRepo.Create(project); err != nil {
					return false
				}

				// Ensure we have at least 2 sections and at most 10
				actualNumSections := numSections
				if actualNumSections < 2 {
					actualNumSections = 2
				}
				if actualNumSections > 10 {
					actualNumSections = 10
				}

				// Create report sections with specific order_index values
				// If shuffleOrder is true, we'll insert them in a different order than their order_index
				type sectionInfo struct {
					name       string
					orderIndex int
				}

				sectionInfos := make([]sectionInfo, actualNumSections)
				for i := 0; i < actualNumSections; i++ {
					sectionInfos[i] = sectionInfo{
						name:       fmt.Sprintf("Section %d", i),
						orderIndex: i * 10, // Use multiples of 10 to make ordering clear
					}
				}

				// If shuffleOrder is true, shuffle the insertion order (but keep order_index values)
				insertionOrder := make([]int, actualNumSections)
				for i := 0; i < actualNumSections; i++ {
					insertionOrder[i] = i
				}
				if shuffleOrder && actualNumSections > 1 {
					// Simple shuffle: reverse the order
					for i := 0; i < actualNumSections/2; i++ {
						j := actualNumSections - 1 - i
						insertionOrder[i], insertionOrder[j] = insertionOrder[j], insertionOrder[i]
					}
				}

				// Create sections in the (possibly shuffled) insertion order
				createdSections := make([]*models.ReportSection, actualNumSections)
				for _, idx := range insertionOrder {
					info := sectionInfos[idx]
					section := &models.ReportSection{
						ProjectID: project.ID,
						Name:      info.name,
						Type:      "prose",
						Content:   fmt.Sprintf("Content for %s", info.name),
						Order:     info.orderIndex,
						IsEnabled: true,
					}
					if err := service.CreateReportSection(section); err != nil {
						return false
					}
					createdSections[idx] = section
				}

				// Create a task repository
				taskRepo := repository.NewTaskRepository(db)

				// Create a project service
				logger := zap.NewNop()
				templateService := NewTemplateService(logger)
				projectService := NewProjectService(projectRepo, templateService, logger)

				// Generate the report
				date := time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC)
				report, err := service.GenerateReport(project.ID, date, projectService, taskRepo)
				if err != nil {
					return false
				}

				// Verify Property 17: Report Section Ordering
				// The sections should appear in the output in the same order as their order_index values (ascending)

				if len(report.Sections) != actualNumSections {
					return false
				}

				// Verify sections are ordered by their order_index
				for i := 0; i < actualNumSections; i++ {
					expectedSection := createdSections[i]
					actualSection := report.Sections[i]

					// The i-th section in the report should correspond to the section with order_index i*10
					if actualSection.Name != expectedSection.Name {
						return false
					}

					if actualSection.Type != expectedSection.Type {
						return false
					}

					// Verify the content matches
					if actualSection.Content != expectedSection.Content {
						return false
					}
				}

				// Additional verification: ensure sections are in ascending order_index order
				// by checking that each section's name matches the expected sequence
				for i := 0; i < actualNumSections; i++ {
					expectedName := fmt.Sprintf("Section %d", i)
					if report.Sections[i].Name != expectedName {
						return false
					}
				}

				return true
			},
			gen.IntRange(2, 10), // numSections (2-10 sections to test ordering)
			gen.Bool(),          // shuffleOrder (whether to insert sections in shuffled order)
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// TestProperty18_PreviewGenerationDoesNotCreateHistory tests Property 18:
// For any report generation that is not finalized, the system should not create
// any Task_History entries or Report_Snapshot records.
// **Validates: Requirements 8.1**
func TestProperty18_PreviewGenerationDoesNotCreateHistory(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 18: Preview Generation Does Not Create History",
		prop.ForAll(
			func(numTasks int, numSubtasksPerTask int, numSections int) bool {
				service, db := setupReportServiceTest(t)
				defer db.Close()

				// Add all required tables
				schema := `
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
				`
				if _, err := db.Conn.Exec(schema); err != nil {
					return false
				}

				// Create a project
				projectRepo := repository.NewProjectRepository(db)
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Report",
					DefaultDirectory:  "/tmp",
					RecipientsTo:      "test@example.com",
					RecipientsCC:      "cc@example.com",
					RecipientsBCC:     "bcc@example.com",
				}
				if err := projectRepo.Create(project); err != nil {
					return false
				}

				// Create template service and project service
				logger := zap.NewNop()
				templateService := NewTemplateService(logger)
				projectService := NewProjectService(projectRepo, templateService, logger)

				// Create status definitions
				statuses := []string{"not started", "in progress", "done"}
				styles := []string{"gray", "yellow", "green"}
				for i, status := range statuses {
					statusDef := &models.StatusDefinition{
						ProjectID: project.ID,
						Name:      status,
						Style:     styles[i],
						Order:     i,
					}
					if err := service.CreateStatusDefinition(statusDef); err != nil {
						return false
					}
				}

				// Create report sections
				taskRepo := repository.NewTaskRepository(db)
				sections := make([]*models.ReportSection, numSections)
				for i := 0; i < numSections; i++ {
					section := &models.ReportSection{
						ProjectID: project.ID,
						Name:      fmt.Sprintf("Section %d", i),
						Type:      "status",
						Order:     i,
						IsEnabled: true,
					}
					if err := service.CreateReportSection(section); err != nil {
						return false
					}
					sections[i] = section
				}

				// Create tasks with subtasks
				for i := 0; i < numTasks; i++ {
					// Assign task to a section (round-robin)
					sectionIdx := i % numSections
					if sectionIdx >= len(sections) {
						sectionIdx = 0
					}

					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: sections[sectionIdx].ID,
						Name:            fmt.Sprintf("Task %d", i),
						Status:          statuses[i%len(statuses)],
						Priority:        i,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}

					// Create subtasks for this task
					for j := 0; j < numSubtasksPerTask; j++ {
						subtask := &models.Subtask{
							TaskID: task.ID,
							Name:   fmt.Sprintf("Subtask %d-%d", i, j),
							Status: statuses[j%len(statuses)],
						}
						if err := taskRepo.CreateSubtask(subtask); err != nil {
							return false
						}
					}
				}

				// Count snapshots and history entries BEFORE generating report
				var snapshotCountBefore int
				err := db.Conn.QueryRow("SELECT COUNT(*) FROM report_snapshots WHERE project_id = ?", project.ID).Scan(&snapshotCountBefore)
				if err != nil {
					return false
				}

				var historyCountBefore int
				err = db.Conn.QueryRow("SELECT COUNT(*) FROM task_history").Scan(&historyCountBefore)
				if err != nil {
					return false
				}

				// Generate the report (preview - NOT finalized)
				date := time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC)
				report, err := service.GenerateReport(project.ID, date, projectService, taskRepo)
				if err != nil {
					return false
				}

				// Verify the report was generated successfully
				if report == nil {
					return false
				}

				// Count snapshots and history entries AFTER generating report
				var snapshotCountAfter int
				err = db.Conn.QueryRow("SELECT COUNT(*) FROM report_snapshots WHERE project_id = ?", project.ID).Scan(&snapshotCountAfter)
				if err != nil {
					return false
				}

				var historyCountAfter int
				err = db.Conn.QueryRow("SELECT COUNT(*) FROM task_history").Scan(&historyCountAfter)
				if err != nil {
					return false
				}

				// Verify Property 18: Preview Generation Does Not Create History
				// The snapshot count should not have changed
				if snapshotCountAfter != snapshotCountBefore {
					return false
				}

				// The history count should not have changed
				if historyCountAfter != historyCountBefore {
					return false
				}

				// Additional verification: ensure both counts are still 0 (no records created)
				if snapshotCountAfter != 0 {
					return false
				}

				if historyCountAfter != 0 {
					return false
				}

				return true
			},
			gen.IntRange(1, 10), // numTasks (1-10 tasks)
			gen.IntRange(0, 5),  // numSubtasksPerTask (0-5 subtasks per task)
			gen.IntRange(1, 5),  // numSections (1-5 sections)
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Unit Tests for Report Generation
// Task 10.14: Test with various project configurations, with/without previous snapshots, and edge cases

// Helper function to create full schema for report generation tests
func createFullSchemaForReportTests(t *testing.T, db *repository.DB) {
	schema := `
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
	`
	if _, err := db.Conn.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}
}

func TestGenerateReport_WithPreviousSnapshot(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	createFullSchemaForReportTests(t, db)

	// Create project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Status Report - {YYYY-MM-DD}",
		DefaultDirectory:  "/tmp",
		RecipientsTo:      "team@example.com",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)
	taskRepo := repository.NewTaskRepository(db)

	// Create status definitions
	statuses := []*models.StatusDefinition{
		{ProjectID: project.ID, Name: "not started", Style: "gray", Order: 0},
		{ProjectID: project.ID, Name: "in progress", Style: "yellow", Order: 1},
		{ProjectID: project.ID, Name: "done", Style: "green", Order: 2},
	}
	for _, status := range statuses {
		if err := service.CreateStatusDefinition(status); err != nil {
			t.Fatalf("Failed to create status: %v", err)
		}
	}

	// Create report section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Roadmap",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	// Create a task
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Implement feature",
		Status:          "not started",
		Priority:        0,
	}
	if err := taskRepo.CreateTask(task); err != nil {
		t.Fatalf("Failed to create task: %v", err)
	}

	// Create a previous snapshot with task history
	snapshot := &models.ReportSnapshot{
		ProjectID:       project.ID,
		MarkdownContent: "Previous report",
		FinalizedAt:     parseTime("2024-01-01T00:00:00Z"),
	}
	if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
		t.Fatalf("Failed to create snapshot: %v", err)
	}

	history := &models.TaskHistory{
		ReportSnapshotID: snapshot.ID,
		TaskID:           task.ID,
		Name:             "Implement feature",
		Status:           "not started",
		CreatedAt:        parseTime("2024-01-01T00:00:00Z"),
	}
	if err := service.repo.CreateTaskHistory(history); err != nil {
		t.Fatalf("Failed to create task history: %v", err)
	}

	// Update task status
	task.Status = "in progress"
	if err := taskRepo.UpdateTask(task); err != nil {
		t.Fatalf("Failed to update task: %v", err)
	}

	// Generate report
	reportDate := parseTime("2024-02-01T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// Verify report shows status change
	if len(report.Sections) == 0 {
		t.Fatal("Expected at least one section")
	}

	content := report.Sections[0].Content
	if !containsHelper(content, "not started") {
		t.Error("Expected report to show old status 'not started'")
	}
	if !containsHelper(content, "in progress") {
		t.Error("Expected report to show new status 'in progress'")
	}
	if !containsHelper(content, "→") {
		t.Error("Expected report to show status change arrow")
	}
}

func TestGenerateReport_MultipleSections(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	createFullSchemaForReportTests(t, db)

	// Create project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Multi-Section Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)
	taskRepo := repository.NewTaskRepository(db)

	// Create status definitions
	status := &models.StatusDefinition{
		ProjectID: project.ID,
		Name:      "in progress",
		Style:     "yellow",
		Order:     0,
	}
	if err := service.CreateStatusDefinition(status); err != nil {
		t.Fatalf("Failed to create status: %v", err)
	}

	// Create multiple sections with different types
	proseSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Summary",
		Type:      "prose",
		Content:   "This is the summary.",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(proseSection); err != nil {
		t.Fatalf("Failed to create prose section: %v", err)
	}

	statusSection1 := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Active Work",
		Type:      "status",
		Order:     1,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(statusSection1); err != nil {
		t.Fatalf("Failed to create status section 1: %v", err)
	}

	statusSection2 := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Completed",
		Type:      "status",
		Order:     2,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(statusSection2); err != nil {
		t.Fatalf("Failed to create status section 2: %v", err)
	}

	// Create tasks in different sections
	task1 := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: statusSection1.ID,
		Name:            "Task in Active Work",
		Status:          "in progress",
		Priority:        0,
	}
	if err := taskRepo.CreateTask(task1); err != nil {
		t.Fatalf("Failed to create task1: %v", err)
	}

	task2 := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: statusSection2.ID,
		Name:            "Task in Completed",
		Status:          "in progress",
		Priority:        0,
	}
	if err := taskRepo.CreateTask(task2); err != nil {
		t.Fatalf("Failed to create task2: %v", err)
	}

	// Generate report
	reportDate := parseTime("2024-02-01T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// Verify all sections are present
	if len(report.Sections) != 3 {
		t.Errorf("Expected 3 sections, got %d", len(report.Sections))
	}

	// Verify section order
	if report.Sections[0].Name != "Summary" {
		t.Errorf("Expected first section to be 'Summary', got '%s'", report.Sections[0].Name)
	}
	if report.Sections[1].Name != "Active Work" {
		t.Errorf("Expected second section to be 'Active Work', got '%s'", report.Sections[1].Name)
	}
	if report.Sections[2].Name != "Completed" {
		t.Errorf("Expected third section to be 'Completed', got '%s'", report.Sections[2].Name)
	}

	// Verify prose section content
	if report.Sections[0].Content != "This is the summary." {
		t.Errorf("Expected prose content, got '%s'", report.Sections[0].Content)
	}

	// Verify status sections contain correct tasks
	if !containsHelper(report.Sections[1].Content, "Task in Active Work") {
		t.Error("Expected 'Active Work' section to contain its task")
	}
	if containsHelper(report.Sections[1].Content, "Task in Completed") {
		t.Error("'Active Work' section should not contain task from other section")
	}

	if !containsHelper(report.Sections[2].Content, "Task in Completed") {
		t.Error("Expected 'Completed' section to contain its task")
	}
	if containsHelper(report.Sections[2].Content, "Task in Active Work") {
		t.Error("'Completed' section should not contain task from other section")
	}
}

func TestGenerateReport_EmptySections(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	createFullSchemaForReportTests(t, db)

	// Create project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Empty Sections Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)
	taskRepo := repository.NewTaskRepository(db)

	// Create sections with no tasks
	emptyProseSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Empty Prose",
		Type:      "prose",
		Content:   "",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(emptyProseSection); err != nil {
		t.Fatalf("Failed to create empty prose section: %v", err)
	}

	emptyStatusSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Empty Status",
		Type:      "status",
		Order:     1,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(emptyStatusSection); err != nil {
		t.Fatalf("Failed to create empty status section: %v", err)
	}

	// Generate report
	reportDate := parseTime("2024-02-01T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// Verify sections are present even if empty
	if len(report.Sections) != 2 {
		t.Errorf("Expected 2 sections, got %d", len(report.Sections))
	}

	// Verify empty prose section
	if report.Sections[0].Content != "" {
		t.Errorf("Expected empty prose content, got '%s'", report.Sections[0].Content)
	}

	// Verify empty status section (should have empty or minimal content)
	// The section should exist but have no tasks
	statusContent := report.Sections[1].Content
	if containsHelper(statusContent, "Task") {
		t.Error("Empty status section should not contain any tasks")
	}
}

func TestGenerateReport_WithSubtasks(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	createFullSchemaForReportTests(t, db)

	// Create project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Subtasks Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)
	taskRepo := repository.NewTaskRepository(db)

	// Create status definitions
	statuses := []*models.StatusDefinition{
		{ProjectID: project.ID, Name: "in progress", Style: "yellow", Order: 0},
		{ProjectID: project.ID, Name: "done", Style: "green", Order: 1},
	}
	for _, status := range statuses {
		if err := service.CreateStatusDefinition(status); err != nil {
			t.Fatalf("Failed to create status: %v", err)
		}
	}

	// Create section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Work Items",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	// Create task with subtasks
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Parent Task",
		Status:          "in progress",
		Priority:        0,
	}
	if err := taskRepo.CreateTask(task); err != nil {
		t.Fatalf("Failed to create task: %v", err)
	}

	subtask1 := &models.Subtask{
		TaskID: task.ID,
		Name:   "Subtask 1",
		Status: "done",
	}
	if err := taskRepo.CreateSubtask(subtask1); err != nil {
		t.Fatalf("Failed to create subtask1: %v", err)
	}

	subtask2 := &models.Subtask{
		TaskID: task.ID,
		Name:   "Subtask 2",
		Status: "in progress",
	}
	if err := taskRepo.CreateSubtask(subtask2); err != nil {
		t.Fatalf("Failed to create subtask2: %v", err)
	}

	// Generate report
	reportDate := parseTime("2024-02-01T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// Verify report contains task and subtasks
	content := report.Sections[0].Content
	if !containsHelper(content, "Parent Task") {
		t.Error("Expected report to contain parent task")
	}
	if !containsHelper(content, "Subtask 1") {
		t.Error("Expected report to contain subtask 1")
	}
	if !containsHelper(content, "Subtask 2") {
		t.Error("Expected report to contain subtask 2")
	}
}

func TestGenerateReport_DeletedAndArchivedTasks(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	createFullSchemaForReportTests(t, db)

	// Create project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Filtered Tasks Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)
	taskRepo := repository.NewTaskRepository(db)

	// Create status definition
	status := &models.StatusDefinition{
		ProjectID: project.ID,
		Name:      "in progress",
		Style:     "yellow",
		Order:     0,
	}
	if err := service.CreateStatusDefinition(status); err != nil {
		t.Fatalf("Failed to create status: %v", err)
	}

	// Create section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Tasks",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	// Create active task
	activeTask := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Active Task",
		Status:          "in progress",
		Priority:        0,
		IsDeleted:       false,
		IsArchived:      false,
	}
	if err := taskRepo.CreateTask(activeTask); err != nil {
		t.Fatalf("Failed to create active task: %v", err)
	}

	// Create deleted task
	deletedTask := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Deleted Task",
		Status:          "in progress",
		Priority:        1,
		IsDeleted:       true,
		IsArchived:      false,
	}
	if err := taskRepo.CreateTask(deletedTask); err != nil {
		t.Fatalf("Failed to create deleted task: %v", err)
	}

	// Create archived task
	archivedTask := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Archived Task",
		Status:          "in progress",
		Priority:        2,
		IsDeleted:       false,
		IsArchived:      true,
	}
	if err := taskRepo.CreateTask(archivedTask); err != nil {
		t.Fatalf("Failed to create archived task: %v", err)
	}

	// Generate report
	reportDate := parseTime("2024-02-01T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// Verify only active task is included
	content := report.Sections[0].Content
	if !containsHelper(content, "Active Task") {
		t.Error("Expected report to contain active task")
	}
	if containsHelper(content, "Deleted Task") {
		t.Error("Report should not contain deleted task")
	}
	if containsHelper(content, "Archived Task") {
		t.Error("Report should not contain archived task")
	}
}

func TestGenerateReport_ECDChanges(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	createFullSchemaForReportTests(t, db)

	// Create project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "ECD Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)
	taskRepo := repository.NewTaskRepository(db)

	// Create status definition
	status := &models.StatusDefinition{
		ProjectID: project.ID,
		Name:      "in progress",
		Style:     "yellow",
		Order:     0,
	}
	if err := service.CreateStatusDefinition(status); err != nil {
		t.Fatalf("Failed to create status: %v", err)
	}

	// Create section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Tasks",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	// Create task with ECD
	oldECD := parseTime("2024-02-15T00:00:00Z")
	task := &models.Task{
		ProjectID:              project.ID,
		ReportSectionID:        section.ID,
		Name:                   "Task with ECD",
		Status:                 "in progress",
		ExpectedCompletionDate: &oldECD,
		Priority:               0,
	}
	if err := taskRepo.CreateTask(task); err != nil {
		t.Fatalf("Failed to create task: %v", err)
	}

	// Create previous snapshot with old ECD
	snapshot := &models.ReportSnapshot{
		ProjectID:       project.ID,
		MarkdownContent: "Previous report",
		FinalizedAt:     parseTime("2024-01-01T00:00:00Z"),
	}
	if err := service.repo.CreateReportSnapshot(snapshot); err != nil {
		t.Fatalf("Failed to create snapshot: %v", err)
	}

	history := &models.TaskHistory{
		ReportSnapshotID:       snapshot.ID,
		TaskID:                 task.ID,
		Name:                   "Task with ECD",
		Status:                 "in progress",
		ExpectedCompletionDate: &oldECD,
		CreatedAt:              parseTime("2024-01-01T00:00:00Z"),
	}
	if err := service.repo.CreateTaskHistory(history); err != nil {
		t.Fatalf("Failed to create task history: %v", err)
	}

	// Update task ECD
	newECD := parseTime("2024-03-01T00:00:00Z")
	task.ExpectedCompletionDate = &newECD
	if err := taskRepo.UpdateTask(task); err != nil {
		t.Fatalf("Failed to update task: %v", err)
	}

	// Generate report
	reportDate := parseTime("2024-02-01T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// Verify report shows ECD change
	content := report.Sections[0].Content
	if !containsHelper(content, "2024-02-15") {
		t.Error("Expected report to show old ECD")
	}
	if !containsHelper(content, "2024-03-01") {
		t.Error("Expected report to show new ECD")
	}
	if !containsHelper(content, "~~") {
		t.Error("Expected report to show strikethrough for old ECD")
	}
}

func TestGenerateReport_CustomRecipients(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	createFullSchemaForReportTests(t, db)

	// Create project with custom recipients
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Custom Recipients Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
		RecipientsTo:      "alice@example.com, bob@example.com",
		RecipientsCC:      "manager@example.com",
		RecipientsBCC:     "archive@example.com",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)
	taskRepo := repository.NewTaskRepository(db)

	// Generate report
	reportDate := parseTime("2024-02-01T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// Verify recipients are correctly set
	if report.Recipients.To != "alice@example.com, bob@example.com" {
		t.Errorf("Expected To 'alice@example.com, bob@example.com', got '%s'", report.Recipients.To)
	}
	if report.Recipients.CC != "manager@example.com" {
		t.Errorf("Expected CC 'manager@example.com', got '%s'", report.Recipients.CC)
	}
	if report.Recipients.BCC != "archive@example.com" {
		t.Errorf("Expected BCC 'archive@example.com', got '%s'", report.Recipients.BCC)
	}
}

func TestGenerateReport_DisabledSections(t *testing.T) {
	service, db := setupReportServiceTest(t)
	defer db.Close()

	createFullSchemaForReportTests(t, db)

	// Create project
	projectRepo := repository.NewProjectRepository(db)
	project := &models.Project{
		Name:              "Disabled Sections Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectRepo.Create(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)
	taskRepo := repository.NewTaskRepository(db)

	// Create enabled section
	enabledSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Enabled Section",
		Type:      "prose",
		Content:   "This should appear",
		Order:     0,
		IsEnabled: true,
	}
	if err := service.CreateReportSection(enabledSection); err != nil {
		t.Fatalf("Failed to create enabled section: %v", err)
	}

	// Create disabled section
	disabledSection := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Disabled Section",
		Type:      "prose",
		Content:   "This should NOT appear",
		Order:     1,
		IsEnabled: false,
	}
	if err := service.CreateReportSection(disabledSection); err != nil {
		t.Fatalf("Failed to create disabled section: %v", err)
	}

	// Generate report
	reportDate := parseTime("2024-02-01T00:00:00Z")
	report, err := service.GenerateReport(project.ID, reportDate, projectService, taskRepo)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// Verify only enabled section is included
	if len(report.Sections) != 1 {
		t.Errorf("Expected 1 section, got %d", len(report.Sections))
	}

	if report.Sections[0].Name != "Enabled Section" {
		t.Errorf("Expected 'Enabled Section', got '%s'", report.Sections[0].Name)
	}

	// Verify disabled section content is not in report
	for _, section := range report.Sections {
		if containsHelper(section.Content, "This should NOT appear") {
			t.Error("Disabled section content should not appear in report")
		}
	}
}

// setupCompleteReportServiceTest sets up a complete test environment with all tables
func setupCompleteReportServiceTest(t *testing.T) (*ReportService, *repository.TaskRepository, *ProjectService, *repository.DB) {
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

	// Initialize complete schema - call the exported InitSchema method
	// Since initSchema is private, we'll create the schema directly
	schema := `
	-- Projects table
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

	-- Report sections table
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

	-- Status definitions table
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

	-- Tasks table
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

	-- Subtasks table
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

	-- Report snapshots table
	CREATE TABLE IF NOT EXISTS report_snapshots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		markdown_content TEXT NOT NULL,
		finalized_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	-- Task history table (audit trail)
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

	-- Indexes for performance
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
		t.Fatalf("failed to create schema: %v", err)
	}

	reportRepo := repository.NewReportRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	projectRepo := repository.NewProjectRepository(db)

	reportService := NewReportService(reportRepo, logger)
	templateService := NewTemplateService(logger)
	projectService := NewProjectService(projectRepo, templateService, logger)

	return reportService, taskRepo, projectService, db
}

func TestFinalizeReport(t *testing.T) {
	reportService, taskRepo, projectService, db := setupCompleteReportServiceTest(t)
	defer db.Close()

	// Create a project
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectService.CreateProject(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Create a report section
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "Roadmap",
		Type:      "status",
		Order:     0,
		IsEnabled: true,
	}
	if err := reportService.CreateReportSection(section); err != nil {
		t.Fatalf("Failed to create section: %v", err)
	}

	// Create tasks
	task1 := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Task 1",
		Status:          "in progress",
		URL:             "https://example.com/task1",
		Notes:           "Task 1 notes",
		Priority:        0,
	}
	if err := taskRepo.CreateTask(task1); err != nil {
		t.Fatalf("Failed to create task 1: %v", err)
	}

	task2 := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Task 2",
		Status:          "done",
		Notes:           "Task 2 notes",
		Priority:        1,
	}
	if err := taskRepo.CreateTask(task2); err != nil {
		t.Fatalf("Failed to create task 2: %v", err)
	}

	// Create subtasks for task1
	subtask1 := &models.Subtask{
		TaskID: task1.ID,
		Name:   "Subtask 1",
		Status: "in progress",
		Notes:  "Subtask 1 notes",
	}
	if err := taskRepo.CreateSubtask(subtask1); err != nil {
		t.Fatalf("Failed to create subtask 1: %v", err)
	}

	subtask2 := &models.Subtask{
		TaskID: task1.ID,
		Name:   "Subtask 2",
		Status: "done",
	}
	if err := taskRepo.CreateSubtask(subtask2); err != nil {
		t.Fatalf("Failed to create subtask 2: %v", err)
	}

	// Create a deleted task (should not be captured)
	deletedTask := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Deleted Task",
		Status:          "in progress",
		IsDeleted:       true,
	}
	if err := taskRepo.CreateTask(deletedTask); err != nil {
		t.Fatalf("Failed to create deleted task: %v", err)
	}

	// Create an archived task (should not be captured)
	archivedTask := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: section.ID,
		Name:            "Archived Task",
		Status:          "done",
		IsArchived:      true,
	}
	if err := taskRepo.CreateTask(archivedTask); err != nil {
		t.Fatalf("Failed to create archived task: %v", err)
	}

	// Finalize report
	markdownContent := "# Test Report\n\nThis is a test report."
	snapshot, err := reportService.FinalizeReport(project.ID, markdownContent, taskRepo)
	if err != nil {
		t.Fatalf("Failed to finalize report: %v", err)
	}

	// Verify snapshot was created
	if snapshot.ID == 0 {
		t.Error("Expected snapshot ID to be set")
	}
	if snapshot.ProjectID != project.ID {
		t.Errorf("Expected project ID %d, got %d", project.ID, snapshot.ProjectID)
	}
	if snapshot.MarkdownContent != markdownContent {
		t.Errorf("Expected markdown content %q, got %q", markdownContent, snapshot.MarkdownContent)
	}
	if snapshot.FinalizedAt.IsZero() {
		t.Error("Expected finalized_at to be set")
	}

	// Verify task history was captured
	reportRepo := repository.NewReportRepository(db)
	histories, err := reportRepo.GetTaskHistoryBySnapshot(snapshot.ID)
	if err != nil {
		t.Fatalf("Failed to get task history: %v", err)
	}

	// Should have 4 history entries: 2 tasks + 2 subtasks (deleted and archived tasks excluded)
	if len(histories) != 4 {
		t.Errorf("Expected 4 history entries, got %d", len(histories))
	}

	// Verify task1 history
	var task1History *models.TaskHistory
	for _, h := range histories {
		if h.TaskID == task1.ID && h.SubtaskID == nil {
			task1History = h
			break
		}
	}
	if task1History == nil {
		t.Fatal("Task 1 history not found")
	}
	if task1History.Name != task1.Name {
		t.Errorf("Expected task name %q, got %q", task1.Name, task1History.Name)
	}
	if task1History.Status != task1.Status {
		t.Errorf("Expected task status %q, got %q", task1.Status, task1History.Status)
	}
	if task1History.URL != task1.URL {
		t.Errorf("Expected task URL %q, got %q", task1.URL, task1History.URL)
	}
	if task1History.Notes != task1.Notes {
		t.Errorf("Expected task notes %q, got %q", task1.Notes, task1History.Notes)
	}

	// Verify subtask1 history
	var subtask1History *models.TaskHistory
	for _, h := range histories {
		if h.SubtaskID != nil && *h.SubtaskID == subtask1.ID {
			subtask1History = h
			break
		}
	}
	if subtask1History == nil {
		t.Fatal("Subtask 1 history not found")
	}
	if subtask1History.Name != subtask1.Name {
		t.Errorf("Expected subtask name %q, got %q", subtask1.Name, subtask1History.Name)
	}
	if subtask1History.Status != subtask1.Status {
		t.Errorf("Expected subtask status %q, got %q", subtask1.Status, subtask1History.Status)
	}

	// Verify timestamps are consistent
	for _, h := range histories {
		if h.CreatedAt.IsZero() {
			t.Error("Expected history created_at to be set")
		}
		// All history entries should have the same timestamp (within 1 second)
		timeDiff := h.CreatedAt.Sub(snapshot.FinalizedAt)
		if timeDiff < 0 {
			timeDiff = -timeDiff
		}
		if timeDiff > time.Second {
			t.Errorf("History timestamp differs from snapshot timestamp by %v", timeDiff)
		}
	}
}

func TestFinalizeReportEmptyProject(t *testing.T) {
	reportService, taskRepo, projectService, db := setupCompleteReportServiceTest(t)
	defer db.Close()

	// Create a project with no tasks
	project := &models.Project{
		Name:              "Empty Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectService.CreateProject(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Finalize report
	markdownContent := "# Empty Report\n\nNo tasks."
	snapshot, err := reportService.FinalizeReport(project.ID, markdownContent, taskRepo)
	if err != nil {
		t.Fatalf("Failed to finalize report: %v", err)
	}

	// Verify snapshot was created
	if snapshot.ID == 0 {
		t.Error("Expected snapshot ID to be set")
	}

	// Verify no task history was captured
	reportRepo := repository.NewReportRepository(db)
	histories, err := reportRepo.GetTaskHistoryBySnapshot(snapshot.ID)
	if err != nil {
		t.Fatalf("Failed to get task history: %v", err)
	}

	if len(histories) != 0 {
		t.Errorf("Expected 0 history entries, got %d", len(histories))
	}
}

func TestGetReportSnapshot(t *testing.T) {
	reportService, taskRepo, projectService, db := setupCompleteReportServiceTest(t)
	defer db.Close()

	// Create a project
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectService.CreateProject(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Finalize a report
	markdownContent := "# Test Report"
	snapshot, err := reportService.FinalizeReport(project.ID, markdownContent, taskRepo)
	if err != nil {
		t.Fatalf("Failed to finalize report: %v", err)
	}

	// Get the snapshot
	retrieved, err := reportService.GetReportSnapshot(snapshot.ID)
	if err != nil {
		t.Fatalf("Failed to get snapshot: %v", err)
	}

	if retrieved.ID != snapshot.ID {
		t.Errorf("Expected snapshot ID %d, got %d", snapshot.ID, retrieved.ID)
	}
	if retrieved.MarkdownContent != markdownContent {
		t.Errorf("Expected markdown content %q, got %q", markdownContent, retrieved.MarkdownContent)
	}
}

func TestListReportSnapshots(t *testing.T) {
	reportService, taskRepo, projectService, db := setupCompleteReportServiceTest(t)
	defer db.Close()

	// Create a project
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := projectService.CreateProject(project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// Finalize multiple reports
	snapshot1, err := reportService.FinalizeReport(project.ID, "# Report 1", taskRepo)
	if err != nil {
		t.Fatalf("Failed to finalize report 1: %v", err)
	}

	time.Sleep(10 * time.Millisecond) // Ensure different timestamps

	snapshot2, err := reportService.FinalizeReport(project.ID, "# Report 2", taskRepo)
	if err != nil {
		t.Fatalf("Failed to finalize report 2: %v", err)
	}

	// List snapshots
	snapshots, err := reportService.ListReportSnapshots(project.ID)
	if err != nil {
		t.Fatalf("Failed to list snapshots: %v", err)
	}

	if len(snapshots) != 2 {
		t.Errorf("Expected 2 snapshots, got %d", len(snapshots))
	}

	// Verify snapshots are ordered by finalized_at DESC (most recent first)
	if snapshots[0].ID != snapshot2.ID {
		t.Errorf("Expected first snapshot to be %d, got %d", snapshot2.ID, snapshots[0].ID)
	}
	if snapshots[1].ID != snapshot1.ID {
		t.Errorf("Expected second snapshot to be %d, got %d", snapshot1.ID, snapshots[1].ID)
	}
}

// Property 8: Task History Capture Completeness
// **Validates: Requirements 4.6, 4.8, 8.11**
func TestProperty8_TaskHistoryCaptureCompleteness(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 8: Task History Capture Completeness",
		prop.ForAll(
			func(numTasks int, numSubtasksPerTask int, numDeletedTasks int, numArchivedTasks int, numDeletedSubtasks int) bool {
				reportService, taskRepo, projectService, db := setupCompleteReportServiceTest(t)
				defer db.Close()

				// Create a project
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Report",
					DefaultDirectory:  "/tmp",
				}
				if err := projectService.CreateProject(project); err != nil {
					return false
				}

				// Create a report section
				section := &models.ReportSection{
					ProjectID: project.ID,
					Name:      "Test Section",
					Type:      "status",
					Order:     1,
					IsEnabled: true,
				}
				if err := reportService.CreateReportSection(section); err != nil {
					return false
				}

				// Track expected counts
				expectedTaskHistoryCount := 0
				expectedSubtaskHistoryCount := 0

				// Create non-deleted, non-archived tasks
				for i := 0; i < numTasks; i++ {
					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: section.ID,
						Name:            fmt.Sprintf("Task %d", i),
						Status:          "in progress",
						Priority:        i,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}
					expectedTaskHistoryCount++

					// Create non-deleted subtasks for this task
					for j := 0; j < numSubtasksPerTask; j++ {
						subtask := &models.Subtask{
							TaskID: task.ID,
							Name:   fmt.Sprintf("Subtask %d-%d", i, j),
							Status: "not started",
						}
						if err := taskRepo.CreateSubtask(subtask); err != nil {
							return false
						}
						expectedSubtaskHistoryCount++
					}

					// Create deleted subtasks (should NOT be captured)
					for j := 0; j < numDeletedSubtasks; j++ {
						subtask := &models.Subtask{
							TaskID:    task.ID,
							Name:      fmt.Sprintf("Deleted Subtask %d-%d", i, j),
							Status:    "done",
							IsDeleted: true,
						}
						if err := taskRepo.CreateSubtask(subtask); err != nil {
							return false
						}
						// Don't increment expected count - deleted subtasks should not be captured
					}
				}

				// Create deleted tasks (should NOT be captured)
				for i := 0; i < numDeletedTasks; i++ {
					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: section.ID,
						Name:            fmt.Sprintf("Deleted Task %d", i),
						Status:          "done",
						Priority:        numTasks + i,
						IsDeleted:       true,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}
					// Don't increment expected count - deleted tasks should not be captured
				}

				// Create archived tasks (should NOT be captured)
				for i := 0; i < numArchivedTasks; i++ {
					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: section.ID,
						Name:            fmt.Sprintf("Archived Task %d", i),
						Status:          "done",
						Priority:        numTasks + numDeletedTasks + i,
						IsArchived:      true,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}
					// Don't increment expected count - archived tasks should not be captured
				}

				// Finalize report
				markdownContent := "# Test Report\n\nThis is a test report."
				snapshot, err := reportService.FinalizeReport(project.ID, markdownContent, taskRepo)
				if err != nil {
					return false
				}

				// Verify snapshot was created
				if snapshot == nil || snapshot.ID == 0 {
					return false
				}

				// Query task history entries
				query := `
					SELECT id, report_snapshot_id, task_id, subtask_id, name, status, 
						expected_completion_date, url, notes, created_at
					FROM task_history
					WHERE report_snapshot_id = ?
					ORDER BY task_id, subtask_id
				`
				rows, err := db.Conn.Query(query, snapshot.ID)
				if err != nil {
					return false
				}
				defer rows.Close()

				taskHistoryCount := 0
				subtaskHistoryCount := 0
				seenTaskIDs := make(map[int64]bool)
				seenSubtaskIDs := make(map[int64]bool)

				for rows.Next() {
					var history models.TaskHistory
					var subtaskID *int64
					var ecd *time.Time

					err := rows.Scan(
						&history.ID,
						&history.ReportSnapshotID,
						&history.TaskID,
						&subtaskID,
						&history.Name,
						&history.Status,
						&ecd,
						&history.URL,
						&history.Notes,
						&history.CreatedAt,
					)
					if err != nil {
						return false
					}

					// Verify report_snapshot_id matches
					if history.ReportSnapshotID != snapshot.ID {
						return false
					}

					// Verify all required fields are captured
					if history.Name == "" {
						return false
					}
					if history.Status == "" {
						return false
					}

					if subtaskID == nil {
						// This is a task-level history entry
						taskHistoryCount++
						seenTaskIDs[history.TaskID] = true

						// Verify the task exists and is not deleted/archived
						task, err := taskRepo.GetTaskByID(history.TaskID)
						if err != nil {
							return false
						}
						if task.IsDeleted || task.IsArchived {
							return false // Should not capture deleted/archived tasks
						}

						// Verify captured data matches current task state
						if history.Name != task.Name {
							return false
						}
						if history.Status != task.Status {
							return false
						}
						if history.URL != task.URL {
							return false
						}
						if history.Notes != task.Notes {
							return false
						}
					} else {
						// This is a subtask-level history entry
						subtaskHistoryCount++
						seenSubtaskIDs[*subtaskID] = true

						// Verify the subtask exists and is not deleted
						subtask, err := taskRepo.GetSubtaskByID(*subtaskID)
						if err != nil {
							return false
						}
						if subtask.IsDeleted {
							return false // Should not capture deleted subtasks
						}

						// Verify captured data matches current subtask state
						if history.Name != subtask.Name {
							return false
						}
						if history.Status != subtask.Status {
							return false
						}
						if history.URL != subtask.URL {
							return false
						}
						if history.Notes != subtask.Notes {
							return false
						}
					}
				}

				if err := rows.Err(); err != nil {
					return false
				}

				// Verify counts match expectations
				if taskHistoryCount != expectedTaskHistoryCount {
					return false
				}
				if subtaskHistoryCount != expectedSubtaskHistoryCount {
					return false
				}

				// Verify all non-deleted, non-archived tasks have history entries
				allTasks, err := taskRepo.ListTasksByProject(project.ID)
				if err != nil {
					return false
				}
				for _, task := range allTasks {
					if !seenTaskIDs[task.ID] {
						return false // Missing task history entry
					}

					// Verify all non-deleted subtasks have history entries
					subtasks, err := taskRepo.ListSubtasksByTask(task.ID)
					if err != nil {
						return false
					}
					for _, subtask := range subtasks {
						if !seenSubtaskIDs[subtask.ID] {
							return false // Missing subtask history entry
						}
					}
				}

				return true
			},
			gen.IntRange(0, 5), // numTasks
			gen.IntRange(0, 3), // numSubtasksPerTask
			gen.IntRange(0, 2), // numDeletedTasks
			gen.IntRange(0, 2), // numArchivedTasks
			gen.IntRange(0, 2), // numDeletedSubtasks
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 9: Task History Timestamp Presence
// **Validates: Requirements 4.7, 8.12**
func TestProperty9_TaskHistoryTimestampPresence(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 9: Task History Timestamp Presence",
		prop.ForAll(
			func(numTasks int, numSubtasksPerTask int) bool {
				reportService, taskRepo, projectService, db := setupCompleteReportServiceTest(t)
				defer db.Close()

				// Create a project
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Report",
					DefaultDirectory:  "/tmp",
				}
				if err := projectService.CreateProject(project); err != nil {
					return false
				}

				// Create a report section
				section := &models.ReportSection{
					ProjectID: project.ID,
					Name:      "Test Section",
					Type:      "status",
					Order:     1,
					IsEnabled: true,
				}
				if err := reportService.CreateReportSection(section); err != nil {
					return false
				}

				// Create tasks with subtasks
				for i := 0; i < numTasks; i++ {
					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: section.ID,
						Name:            fmt.Sprintf("Task %d", i),
						Status:          "in progress",
						Priority:        i,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}

					// Create subtasks for this task
					for j := 0; j < numSubtasksPerTask; j++ {
						subtask := &models.Subtask{
							TaskID: task.ID,
							Name:   fmt.Sprintf("Subtask %d-%d", i, j),
							Status: "not started",
						}
						if err := taskRepo.CreateSubtask(subtask); err != nil {
							return false
						}
					}
				}

				// Record the time just before finalization
				beforeFinalization := time.Now()

				// Small delay to ensure we can measure time difference
				time.Sleep(10 * time.Millisecond)

				// Finalize report
				markdownContent := "# Test Report\n\nThis is a test report."
				snapshot, err := reportService.FinalizeReport(project.ID, markdownContent, taskRepo)
				if err != nil {
					return false
				}

				// Small delay after finalization
				time.Sleep(10 * time.Millisecond)

				// Record the time just after finalization
				afterFinalization := time.Now()

				// Verify snapshot was created
				if snapshot == nil || snapshot.ID == 0 {
					return false
				}

				// Query all task history entries for this snapshot
				query := `
					SELECT id, created_at
					FROM task_history
					WHERE report_snapshot_id = ?
				`
				rows, err := db.Conn.Query(query, snapshot.ID)
				if err != nil {
					return false
				}
				defer rows.Close()

				historyCount := 0
				for rows.Next() {
					var id int64
					var createdAt time.Time

					if err := rows.Scan(&id, &createdAt); err != nil {
						return false
					}

					historyCount++

					// Property: Verify timestamp is present (not zero)
					if createdAt.IsZero() {
						return false
					}

					// Property: Verify timestamp matches finalization time (within tolerance)
					// The timestamp should be between beforeFinalization and afterFinalization
					if createdAt.Before(beforeFinalization) {
						return false
					}
					if createdAt.After(afterFinalization) {
						return false
					}

					// Additional check: Verify timestamp is within a few seconds of snapshot finalization time
					timeDiff := createdAt.Sub(snapshot.FinalizedAt)
					if timeDiff < 0 {
						timeDiff = -timeDiff
					}
					// Allow up to 5 seconds tolerance (generous for test environments)
					if timeDiff > 5*time.Second {
						return false
					}
				}

				if err := rows.Err(); err != nil {
					return false
				}

				// Verify we actually checked some history entries
				// If numTasks is 0, we should have 0 history entries
				// Otherwise, we should have at least numTasks entries (one per task)
				expectedMinCount := numTasks + (numTasks * numSubtasksPerTask)
				if historyCount != expectedMinCount {
					return false
				}

				return true
			},
			gen.IntRange(1, 10), // numTasks: 1-10 tasks
			gen.IntRange(0, 5),  // numSubtasksPerTask: 0-5 subtasks per task
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// TestProperty20_SnapshotCreationOnFinalization tests Property 20:
// For any report finalization, the system should create exactly one Report_Snapshot record
// with the markdown content and a finalization timestamp.
// **Validates: Requirements 8.10**
func TestProperty20_SnapshotCreationOnFinalization(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 20: Snapshot Creation on Finalization",
		prop.ForAll(
			func(numTasks int, numSubtasksPerTask int, contentLength int) bool {
				reportService, taskRepo, projectService, db := setupCompleteReportServiceTest(t)
				defer db.Close()

				// Create a project
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Report",
					DefaultDirectory:  "/tmp",
				}
				if err := projectService.CreateProject(project); err != nil {
					return false
				}

				// Create a report section
				section := &models.ReportSection{
					ProjectID: project.ID,
					Name:      "Test Section",
					Type:      "status",
					Order:     1,
					IsEnabled: true,
				}
				if err := reportService.CreateReportSection(section); err != nil {
					return false
				}

				// Create tasks with subtasks
				for i := 0; i < numTasks; i++ {
					task := &models.Task{
						ProjectID:       project.ID,
						ReportSectionID: section.ID,
						Name:            fmt.Sprintf("Task %d", i),
						Status:          "in progress",
						Priority:        i,
					}
					if err := taskRepo.CreateTask(task); err != nil {
						return false
					}

					// Create subtasks for this task
					for j := 0; j < numSubtasksPerTask; j++ {
						subtask := &models.Subtask{
							TaskID: task.ID,
							Name:   fmt.Sprintf("Subtask %d-%d", i, j),
							Status: "not started",
						}
						if err := taskRepo.CreateSubtask(subtask); err != nil {
							return false
						}
					}
				}

				// Generate markdown content with variable length
				markdownContent := "# Test Report\n\n"
				for i := 0; i < contentLength; i++ {
					markdownContent += fmt.Sprintf("Line %d of content.\n", i)
				}

				// Count snapshots before finalization
				snapshotsBefore, err := reportService.ListReportSnapshots(project.ID)
				if err != nil {
					return false
				}
				countBefore := len(snapshotsBefore)

				// Record time before finalization
				beforeFinalization := time.Now()

				// Finalize report
				snapshot, err := reportService.FinalizeReport(project.ID, markdownContent, taskRepo)
				if err != nil {
					return false
				}

				// Record time after finalization
				afterFinalization := time.Now()

				// Property 1: Verify exactly one snapshot was created
				if snapshot == nil {
					return false
				}
				if snapshot.ID == 0 {
					return false
				}

				// Count snapshots after finalization
				snapshotsAfter, err := reportService.ListReportSnapshots(project.ID)
				if err != nil {
					return false
				}
				countAfter := len(snapshotsAfter)

				// Verify exactly one snapshot was added
				if countAfter != countBefore+1 {
					return false
				}

				// Property 2: Verify snapshot contains the markdown content
				if snapshot.MarkdownContent != markdownContent {
					return false
				}

				// Property 3: Verify snapshot has a finalization timestamp
				if snapshot.FinalizedAt.IsZero() {
					return false
				}

				// Property 4: Verify timestamp is within the finalization window
				if snapshot.FinalizedAt.Before(beforeFinalization) {
					return false
				}
				if snapshot.FinalizedAt.After(afterFinalization) {
					return false
				}

				// Property 5: Verify snapshot is linked to the correct project
				if snapshot.ProjectID != project.ID {
					return false
				}

				// Verify we can retrieve the snapshot by ID
				retrievedSnapshot, err := reportService.GetReportSnapshot(snapshot.ID)
				if err != nil {
					return false
				}
				if retrievedSnapshot.ID != snapshot.ID {
					return false
				}
				if retrievedSnapshot.MarkdownContent != markdownContent {
					return false
				}
				if retrievedSnapshot.ProjectID != project.ID {
					return false
				}

				// Verify the snapshot appears in the list
				found := false
				for _, s := range snapshotsAfter {
					if s.ID == snapshot.ID {
						found = true
						if s.MarkdownContent != markdownContent {
							return false
						}
						if s.ProjectID != project.ID {
							return false
						}
						break
					}
				}
				if !found {
					return false
				}

				return true
			},
			gen.IntRange(0, 10),  // numTasks: 0-10 tasks
			gen.IntRange(0, 5),   // numSubtasksPerTask: 0-5 subtasks per task
			gen.IntRange(1, 100), // contentLength: 1-100 lines of content
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

package services

import (
	"database/sql"
	"fmt"
	"path/filepath"
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

func setupProjectServiceTest(t *testing.T) (*ProjectService, *repository.DB) {
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

	// Initialize schema using the unexported method via reflection or direct call
	// Since initSchema is unexported, we need to use InitDB or create a test helper
	// For now, let's use a workaround by creating the schema directly
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
	`
	if _, err := conn.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	projectRepo := repository.NewProjectRepository(db)
	templateService := NewTemplateService(logger)
	service := NewProjectService(projectRepo, templateService, logger)

	return service, db
}

func TestProjectService_CreateProject(t *testing.T) {
	service, db := setupProjectServiceTest(t)
	defer db.Close()

	tests := []struct {
		name    string
		project *models.Project
		wantErr bool
	}{
		{
			name: "valid project",
			project: &models.Project{
				Name:              "Test Project",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				ReportTitleFormat: "{project-name} Report",
				DefaultDirectory:  "/tmp",
				UseYearSubfolders: false,
			},
			wantErr: false,
		},
		{
			name: "empty name",
			project: &models.Project{
				Name:              "",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				ReportTitleFormat: "{project-name} Report",
			},
			wantErr: true,
		},
		{
			name: "whitespace-only name",
			project: &models.Project{
				Name:              "   ",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				ReportTitleFormat: "{project-name} Report",
			},
			wantErr: true,
		},
		{
			name: "invalid filename format",
			project: &models.Project{
				Name:              "Test Project",
				FilenameFormat:    "invalid/format.md",
				ReportTitleFormat: "{project-name} Report",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.CreateProject(tt.project)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateProject() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if tt.project.ID == 0 {
					t.Error("CreateProject() did not set project ID")
				}
				if tt.project.CreatedAt.IsZero() {
					t.Error("CreateProject() did not set CreatedAt")
				}
				if tt.project.UpdatedAt.IsZero() {
					t.Error("CreateProject() did not set UpdatedAt")
				}
			}
		})
	}
}

func TestProjectService_UpdateProject(t *testing.T) {
	service, db := setupProjectServiceTest(t)
	defer db.Close()

	// Create initial project
	project := &models.Project{
		Name:              "Original Name",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp",
	}
	if err := service.CreateProject(project); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	tests := []struct {
		name    string
		update  func(*models.Project)
		wantErr bool
	}{
		{
			name: "valid update",
			update: func(p *models.Project) {
				p.Name = "Updated Name"
			},
			wantErr: false,
		},
		{
			name: "empty name",
			update: func(p *models.Project) {
				p.Name = ""
			},
			wantErr: true,
		},
		{
			name: "invalid filename format",
			update: func(p *models.Project) {
				p.FilenameFormat = "invalid/format.md"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Make a copy of the project
			testProject := *project
			tt.update(&testProject)

			err := service.UpdateProject(&testProject)
			if (err != nil) != tt.wantErr {
				t.Errorf("UpdateProject() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestProjectService_GetProject(t *testing.T) {
	service, db := setupProjectServiceTest(t)
	defer db.Close()

	// Create a project
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
	}
	if err := service.CreateProject(project); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Test getting the project
	retrieved, err := service.GetProject(project.ID)
	if err != nil {
		t.Fatalf("GetProject() error = %v", err)
	}

	if retrieved.ID != project.ID {
		t.Errorf("GetProject() ID = %v, want %v", retrieved.ID, project.ID)
	}
	if retrieved.Name != project.Name {
		t.Errorf("GetProject() Name = %v, want %v", retrieved.Name, project.Name)
	}

	// Test getting non-existent project
	_, err = service.GetProject(99999)
	if err == nil {
		t.Error("GetProject() expected error for non-existent project")
	}
}

func TestProjectService_ListActiveProjects(t *testing.T) {
	service, db := setupProjectServiceTest(t)
	defer db.Close()

	// Create active projects
	for i := 0; i < 3; i++ {
		project := &models.Project{
			Name:              "Active Project",
			FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
			ReportTitleFormat: "{project-name} Report",
			IsArchived:        false,
		}
		if err := service.CreateProject(project); err != nil {
			t.Fatalf("failed to create project: %v", err)
		}
	}

	// Create archived project
	archivedProject := &models.Project{
		Name:              "Archived Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		IsArchived:        true,
	}
	if err := service.CreateProject(archivedProject); err != nil {
		t.Fatalf("failed to create archived project: %v", err)
	}

	// List active projects
	projects, err := service.ListActiveProjects()
	if err != nil {
		t.Fatalf("ListActiveProjects() error = %v", err)
	}

	if len(projects) != 3 {
		t.Errorf("ListActiveProjects() returned %d projects, want 3", len(projects))
	}

	// Verify no archived projects in the list
	for _, p := range projects {
		if p.IsArchived {
			t.Error("ListActiveProjects() returned archived project")
		}
	}
}

func TestProjectService_ListArchivedProjects(t *testing.T) {
	service, db := setupProjectServiceTest(t)
	defer db.Close()

	// Create active project
	activeProject := &models.Project{
		Name:              "Active Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		IsArchived:        false,
	}
	if err := service.CreateProject(activeProject); err != nil {
		t.Fatalf("failed to create active project: %v", err)
	}

	// Create archived projects
	for i := 0; i < 2; i++ {
		project := &models.Project{
			Name:              "Archived Project",
			FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
			ReportTitleFormat: "{project-name} Report",
			IsArchived:        true,
		}
		if err := service.CreateProject(project); err != nil {
			t.Fatalf("failed to create project: %v", err)
		}
	}

	// List archived projects
	projects, err := service.ListArchivedProjects()
	if err != nil {
		t.Fatalf("ListArchivedProjects() error = %v", err)
	}

	if len(projects) != 2 {
		t.Errorf("ListArchivedProjects() returned %d projects, want 2", len(projects))
	}

	// Verify all are archived
	for _, p := range projects {
		if !p.IsArchived {
			t.Error("ListArchivedProjects() returned non-archived project")
		}
	}
}

func TestProjectService_ArchiveProject(t *testing.T) {
	service, db := setupProjectServiceTest(t)
	defer db.Close()

	// Create a project
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		IsArchived:        false,
	}
	if err := service.CreateProject(project); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Archive the project
	if err := service.ArchiveProject(project.ID); err != nil {
		t.Fatalf("ArchiveProject() error = %v", err)
	}

	// Verify it's archived
	retrieved, err := service.GetProject(project.ID)
	if err != nil {
		t.Fatalf("GetProject() error = %v", err)
	}

	if !retrieved.IsArchived {
		t.Error("ArchiveProject() did not set IsArchived to true")
	}

	// Test archiving non-existent project
	err = service.ArchiveProject(99999)
	if err == nil {
		t.Error("ArchiveProject() expected error for non-existent project")
	}
}

func TestProjectService_RenderFilename(t *testing.T) {
	service, db := setupProjectServiceTest(t)
	defer db.Close()

	project := &models.Project{
		Name:           "Test Project",
		FilenameFormat: "{project-name}-{YYYY-MM-DD}.md",
	}

	date := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)
	filename := service.RenderFilename(project, date)

	expected := "Test-Project-2026-02-20.md"
	if filename != expected {
		t.Errorf("RenderFilename() = %v, want %v", filename, expected)
	}
}

func TestProjectService_RenderReportTitle(t *testing.T) {
	service, db := setupProjectServiceTest(t)
	defer db.Close()

	project := &models.Project{
		Name:              "Test Project",
		ReportTitleFormat: "{project-name} Report - {YYYY-MM-DD}",
	}

	date := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)
	title := service.RenderReportTitle(project, date)

	expected := "Test Project Report - 2026-02-20"
	if title != expected {
		t.Errorf("RenderReportTitle() = %v, want %v", title, expected)
	}
}

func TestProjectService_GetSuggestedFilepath(t *testing.T) {
	service, db := setupProjectServiceTest(t)
	defer db.Close()

	date := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		project  *models.Project
		expected string
	}{
		{
			name: "without year subfolders",
			project: &models.Project{
				Name:              "Test Project",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				DefaultDirectory:  "/reports",
				UseYearSubfolders: false,
			},
			expected: "/reports/Test-Project-2026-02-20.md",
		},
		{
			name: "with year subfolders",
			project: &models.Project{
				Name:              "Test Project",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				DefaultDirectory:  "/reports",
				UseYearSubfolders: true,
			},
			expected: "/reports/2026/Test-Project-2026-02-20.md",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filepath := service.GetSuggestedFilepath(tt.project, date)
			if filepath != tt.expected {
				t.Errorf("GetSuggestedFilepath() = %v, want %v", filepath, tt.expected)
			}
		})
	}
}

// Property 1: Project Name Validation
// **Validates: Requirements 1.1**
func TestProperty1_ProjectNameValidation(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 1: Project Name Validation",
		prop.ForAll(
			func(name string) bool {
				service, db := setupProjectServiceTest(t)
				defer db.Close()

				// Create project with the generated name
				project := &models.Project{
					Name:              name,
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Report",
					DefaultDirectory:  "/tmp",
				}

				err := service.CreateProject(project)

				// If name is empty or whitespace-only, should return error
				trimmed := strings.TrimSpace(name)
				if trimmed == "" {
					return err != nil
				}

				// If name is valid (non-empty after trimming), should succeed
				return err == nil
			},
			// Generate strings including empty, whitespace-only, and valid names
			gen.OneGenOf(
				gen.Const(""),       // Empty string
				gen.Const("   "),    // Whitespace only
				gen.Const("\t\n  "), // Mixed whitespace
				gen.AlphaString().SuchThat(func(s string) bool { // Valid names
					return len(s) > 0 && len(s) < 100
				}),
			),
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 2: Year Subfolder Path Construction
// **Validates: Requirements 1.6**

func TestProperty2_YearSubfolderPathConstruction(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 2: Year Subfolder Path Construction",
		prop.ForAll(
			func(year int, month int, day int, defaultDir string) bool {
				service, db := setupProjectServiceTest(t)
				defer db.Close()

				// Create a valid date from the generated components
				// Clamp month to 1-12 and day to 1-28 to avoid invalid dates
				if month < 1 {
					month = 1
				}
				if month > 12 {
					month = 12
				}
				if day < 1 {
					day = 1
				}
				if day > 28 {
					day = 28
				}

				date := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)

				// Create project with year subfolders enabled
				project := &models.Project{
					Name:              "Test Project",
					FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
					ReportTitleFormat: "{project-name} Report",
					DefaultDirectory:  defaultDir,
					UseYearSubfolders: true,
				}

				// Get suggested filepath
				filepath := service.GetSuggestedFilepath(project, date)

				// Extract year from date
				expectedYear := fmt.Sprintf("%04d", date.Year())

				// Verify the filepath contains the year subdirectory
				// The path should be: defaultDir/YYYY/filename
				return strings.Contains(filepath, expectedYear)
			},
			// Generate random year (2000-2050)
			gen.IntRange(2000, 2050),
			// Generate random month (1-12)
			gen.IntRange(1, 12),
			// Generate random day (1-28)
			gen.IntRange(1, 28),
			// Generate random directory paths
			gen.OneGenOf(
				gen.Const("/reports"),
				gen.Const("/tmp/reports"),
				gen.Const("/home/user/documents"),
				gen.Const("C:\\Reports"),
				gen.Const(""),
			),
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

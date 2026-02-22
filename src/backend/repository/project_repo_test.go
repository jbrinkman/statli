package repository

import (
	"database/sql"
	"path/filepath"
	"testing"

	"src/backend/models"

	_ "github.com/mattn/go-sqlite3"
	"go.uber.org/zap"
)

func setupTestDB(t *testing.T) *DB {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")

	logger, err := zap.NewDevelopment()
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	conn, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}

	db := &DB{
		Conn:   conn,
		Logger: logger,
	}

	if err := db.initSchema(); err != nil {
		t.Fatalf("failed to initialize schema: %v", err)
	}

	return db
}

func TestProjectRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
		DefaultDirectory:  "/tmp/reports",
		UseYearSubfolders: true,
		RecipientsTo:      "team@example.com",
		RecipientsCC:      "manager@example.com",
		RecipientsBCC:     "",
		IsArchived:        false,
	}

	err := repo.Create(project)
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	if project.ID == 0 {
		t.Error("expected project ID to be set")
	}

	if project.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set")
	}

	if project.UpdatedAt.IsZero() {
		t.Error("expected UpdatedAt to be set")
	}
}

func TestProjectRepository_GetByID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	// Create a project
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
	}

	err := repo.Create(project)
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Retrieve the project
	retrieved, err := repo.GetByID(project.ID)
	if err != nil {
		t.Fatalf("failed to get project: %v", err)
	}

	if retrieved.ID != project.ID {
		t.Errorf("expected ID %d, got %d", project.ID, retrieved.ID)
	}

	if retrieved.Name != project.Name {
		t.Errorf("expected Name %s, got %s", project.Name, retrieved.Name)
	}

	if retrieved.FilenameFormat != project.FilenameFormat {
		t.Errorf("expected FilenameFormat %s, got %s", project.FilenameFormat, retrieved.FilenameFormat)
	}
}

func TestProjectRepository_GetByID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	_, err := repo.GetByID(999)
	if err == nil {
		t.Error("expected error for non-existent project")
	}
}

func TestProjectRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	// Create a project
	project := &models.Project{
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Report",
	}

	err := repo.Create(project)
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Update the project
	project.Name = "Updated Project"
	project.FilenameFormat = "{project-name}-status-{YYYY-MM-DD}.md"
	project.UseYearSubfolders = true

	err = repo.Update(project)
	if err != nil {
		t.Fatalf("failed to update project: %v", err)
	}

	// Retrieve and verify
	retrieved, err := repo.GetByID(project.ID)
	if err != nil {
		t.Fatalf("failed to get project: %v", err)
	}

	if retrieved.Name != "Updated Project" {
		t.Errorf("expected Name 'Updated Project', got %s", retrieved.Name)
	}

	if retrieved.FilenameFormat != "{project-name}-status-{YYYY-MM-DD}.md" {
		t.Errorf("expected updated FilenameFormat, got %s", retrieved.FilenameFormat)
	}

	if !retrieved.UseYearSubfolders {
		t.Error("expected UseYearSubfolders to be true")
	}
}

func TestProjectRepository_Update_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	project := &models.Project{
		ID:   999,
		Name: "Non-existent Project",
	}

	err := repo.Update(project)
	if err == nil {
		t.Error("expected error for non-existent project")
	}
}

func TestProjectRepository_ListActive(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	// Create active projects
	project1 := &models.Project{
		Name:       "Active Project 1",
		IsArchived: false,
	}
	project2 := &models.Project{
		Name:       "Active Project 2",
		IsArchived: false,
	}

	// Create archived project
	project3 := &models.Project{
		Name:       "Archived Project",
		IsArchived: true,
	}

	repo.Create(project1)
	repo.Create(project2)
	repo.Create(project3)

	// List active projects
	active, err := repo.ListActive()
	if err != nil {
		t.Fatalf("failed to list active projects: %v", err)
	}

	if len(active) != 2 {
		t.Errorf("expected 2 active projects, got %d", len(active))
	}

	// Verify archived project is not in the list
	for _, p := range active {
		if p.IsArchived {
			t.Error("found archived project in active list")
		}
	}
}

func TestProjectRepository_ListArchived(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	// Create active projects
	project1 := &models.Project{
		Name:       "Active Project 1",
		IsArchived: false,
	}

	// Create archived projects
	project2 := &models.Project{
		Name:       "Archived Project 1",
		IsArchived: true,
	}
	project3 := &models.Project{
		Name:       "Archived Project 2",
		IsArchived: true,
	}

	repo.Create(project1)
	repo.Create(project2)
	repo.Create(project3)

	// List archived projects
	archived, err := repo.ListArchived()
	if err != nil {
		t.Fatalf("failed to list archived projects: %v", err)
	}

	if len(archived) != 2 {
		t.Errorf("expected 2 archived projects, got %d", len(archived))
	}

	// Verify all projects in the list are archived
	for _, p := range archived {
		if !p.IsArchived {
			t.Error("found active project in archived list")
		}
	}
}

func TestProjectRepository_Archive(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	// Create an active project
	project := &models.Project{
		Name:       "Test Project",
		IsArchived: false,
	}

	err := repo.Create(project)
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Archive the project
	err = repo.Archive(project.ID)
	if err != nil {
		t.Fatalf("failed to archive project: %v", err)
	}

	// Verify the project is archived
	retrieved, err := repo.GetByID(project.ID)
	if err != nil {
		t.Fatalf("failed to get project: %v", err)
	}

	if !retrieved.IsArchived {
		t.Error("expected project to be archived")
	}
}

func TestProjectRepository_Archive_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	err := repo.Archive(999)
	if err == nil {
		t.Error("expected error for non-existent project")
	}
}

func TestProjectRepository_ListActive_Empty(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	active, err := repo.ListActive()
	if err != nil {
		t.Fatalf("failed to list active projects: %v", err)
	}

	if len(active) != 0 {
		t.Errorf("expected 0 active projects, got %d", len(active))
	}
}

func TestProjectRepository_ListArchived_Empty(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewProjectRepository(db)

	archived, err := repo.ListArchived()
	if err != nil {
		t.Fatalf("failed to list archived projects: %v", err)
	}

	if len(archived) != 0 {
		t.Errorf("expected 0 archived projects, got %d", len(archived))
	}
}

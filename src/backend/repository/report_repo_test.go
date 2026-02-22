package repository

import (
	"testing"
	"time"

	"src/backend/models"
)

func TestReportRepository_CreateReportSection(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	reportRepo := NewReportRepository(db)
	section := &models.ReportSection{
		ProjectID: project.ID,
		Name:      "TL;DR",
		Type:      "prose",
		Content:   "Test content",
		Order:     1,
		IsEnabled: true,
	}

	err := reportRepo.CreateReportSection(section)
	if err != nil {
		t.Fatalf("failed to create report section: %v", err)
	}

	if section.ID == 0 {
		t.Error("expected section ID to be set")
	}
}

func TestReportRepository_ListReportSections(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	reportRepo := NewReportRepository(db)
	section1 := &models.ReportSection{ProjectID: project.ID, Name: "Section 1", Type: "prose", Order: 1, IsEnabled: true}
	section2 := &models.ReportSection{ProjectID: project.ID, Name: "Section 2", Type: "status", Order: 2, IsEnabled: true}
	reportRepo.CreateReportSection(section1)
	reportRepo.CreateReportSection(section2)

	sections, err := reportRepo.ListReportSections(project.ID)
	if err != nil {
		t.Fatalf("failed to list sections: %v", err)
	}

	if len(sections) != 2 {
		t.Errorf("expected 2 sections, got %d", len(sections))
	}
}

func TestReportRepository_CreateStatusDefinition(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	reportRepo := NewReportRepository(db)
	status := &models.StatusDefinition{
		ProjectID: project.ID,
		Name:      "in progress",
		Style:     "yellow",
		Order:     1,
	}

	err := reportRepo.CreateStatusDefinition(status)
	if err != nil {
		t.Fatalf("failed to create status definition: %v", err)
	}

	if status.ID == 0 {
		t.Error("expected status ID to be set")
	}
}

func TestReportRepository_CreateReportSnapshot(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	reportRepo := NewReportRepository(db)
	snapshot := &models.ReportSnapshot{
		ProjectID:       project.ID,
		MarkdownContent: "# Test Report",
		FinalizedAt:     time.Now(),
	}

	err := reportRepo.CreateReportSnapshot(snapshot)
	if err != nil {
		t.Fatalf("failed to create snapshot: %v", err)
	}

	if snapshot.ID == 0 {
		t.Error("expected snapshot ID to be set")
	}
}

func TestReportRepository_CreateTaskHistory(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Setup
	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	result, _ := db.Conn.Exec(`INSERT INTO report_sections (project_id, name, type, order_index) VALUES (?, 'Section', 'status', 1)`, project.ID)
	sectionID, _ := result.LastInsertId()

	taskRepo := NewTaskRepository(db)
	task := &models.Task{ProjectID: project.ID, ReportSectionID: sectionID, Name: "Task", Status: "done"}
	taskRepo.CreateTask(task)

	reportRepo := NewReportRepository(db)
	snapshot := &models.ReportSnapshot{ProjectID: project.ID, MarkdownContent: "# Report", FinalizedAt: time.Now()}
	reportRepo.CreateReportSnapshot(snapshot)

	history := &models.TaskHistory{
		ReportSnapshotID: snapshot.ID,
		TaskID:           task.ID,
		SubtaskID:        nil,
		Name:             "Task",
		Status:           "done",
		CreatedAt:        time.Now(),
	}

	err := reportRepo.CreateTaskHistory(history)
	if err != nil {
		t.Fatalf("failed to create task history: %v", err)
	}

	if history.ID == 0 {
		t.Error("expected history ID to be set")
	}
}

func TestReportRepository_GetLastTaskHistory(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Setup
	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	result, _ := db.Conn.Exec(`INSERT INTO report_sections (project_id, name, type, order_index) VALUES (?, 'Section', 'status', 1)`, project.ID)
	sectionID, _ := result.LastInsertId()

	taskRepo := NewTaskRepository(db)
	task := &models.Task{ProjectID: project.ID, ReportSectionID: sectionID, Name: "Task", Status: "done"}
	taskRepo.CreateTask(task)

	reportRepo := NewReportRepository(db)
	snapshot := &models.ReportSnapshot{ProjectID: project.ID, MarkdownContent: "# Report", FinalizedAt: time.Now()}
	reportRepo.CreateReportSnapshot(snapshot)

	history := &models.TaskHistory{
		ReportSnapshotID: snapshot.ID,
		TaskID:           task.ID,
		SubtaskID:        nil,
		Name:             "Task",
		Status:           "done",
		CreatedAt:        time.Now(),
	}
	reportRepo.CreateTaskHistory(history)

	// Get last history
	lastHistory, err := reportRepo.GetLastTaskHistory(task.ID, nil)
	if err != nil {
		t.Fatalf("failed to get last task history: %v", err)
	}

	if lastHistory == nil {
		t.Fatal("expected history to be found")
	}

	if lastHistory.Status != "done" {
		t.Errorf("expected status 'done', got %s", lastHistory.Status)
	}
}

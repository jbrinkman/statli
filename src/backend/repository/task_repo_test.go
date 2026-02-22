package repository

import (
	"testing"
	"time"

	"src/backend/models"
)

func TestTaskRepository_CreateTask(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create project and section first
	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	result, _ := db.Conn.Exec(`
		INSERT INTO report_sections (project_id, name, type, order_index)
		VALUES (?, 'Test Section', 'status', 1)
	`, project.ID)
	sectionID, _ := result.LastInsertId()

	// Create task
	taskRepo := NewTaskRepository(db)
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: sectionID,
		Name:            "Test Task",
		Status:          "in progress",
	}

	err := taskRepo.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	if task.ID == 0 {
		t.Error("expected task ID to be set")
	}
}

func TestTaskRepository_SoftDeleteAndRestore(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Setup
	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	result, _ := db.Conn.Exec(`
		INSERT INTO report_sections (project_id, name, type, order_index)
		VALUES (?, 'Test Section', 'status', 1)
	`, project.ID)
	sectionID, _ := result.LastInsertId()

	taskRepo := NewTaskRepository(db)
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: sectionID,
		Name:            "Test Task",
		Status:          "in progress",
	}
	taskRepo.CreateTask(task)

	// Soft delete
	err := taskRepo.SoftDeleteTask(task.ID)
	if err != nil {
		t.Fatalf("failed to soft delete task: %v", err)
	}

	// Verify deleted
	retrieved, _ := taskRepo.GetTaskByID(task.ID)
	if !retrieved.IsDeleted {
		t.Error("expected task to be deleted")
	}

	// Restore
	err = taskRepo.RestoreTask(task.ID)
	if err != nil {
		t.Fatalf("failed to restore task: %v", err)
	}

	// Verify restored
	retrieved, _ = taskRepo.GetTaskByID(task.ID)
	if retrieved.IsDeleted {
		t.Error("expected task to be restored")
	}
}

func TestTaskRepository_CreateSubtask(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Setup
	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	result, _ := db.Conn.Exec(`
		INSERT INTO report_sections (project_id, name, type, order_index)
		VALUES (?, 'Test Section', 'status', 1)
	`, project.ID)
	sectionID, _ := result.LastInsertId()

	taskRepo := NewTaskRepository(db)
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: sectionID,
		Name:            "Test Task",
		Status:          "in progress",
	}
	taskRepo.CreateTask(task)

	// Create subtask
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Test Subtask",
		Status: "not started",
	}

	err := taskRepo.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("failed to create subtask: %v", err)
	}

	if subtask.ID == 0 {
		t.Error("expected subtask ID to be set")
	}
}

func TestTaskRepository_ListSubtasksByTask(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Setup
	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	result, _ := db.Conn.Exec(`
		INSERT INTO report_sections (project_id, name, type, order_index)
		VALUES (?, 'Test Section', 'status', 1)
	`, project.ID)
	sectionID, _ := result.LastInsertId()

	taskRepo := NewTaskRepository(db)
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: sectionID,
		Name:            "Test Task",
		Status:          "in progress",
	}
	taskRepo.CreateTask(task)

	// Create subtasks
	subtask1 := &models.Subtask{TaskID: task.ID, Name: "Subtask 1", Status: "done"}
	subtask2 := &models.Subtask{TaskID: task.ID, Name: "Subtask 2", Status: "in progress"}
	taskRepo.CreateSubtask(subtask1)
	taskRepo.CreateSubtask(subtask2)

	// List subtasks
	subtasks, err := taskRepo.ListSubtasksByTask(task.ID)
	if err != nil {
		t.Fatalf("failed to list subtasks: %v", err)
	}

	if len(subtasks) != 2 {
		t.Errorf("expected 2 subtasks, got %d", len(subtasks))
	}
}

func TestTaskRepository_SoftDeleteSubtask(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Setup
	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	result, _ := db.Conn.Exec(`
		INSERT INTO report_sections (project_id, name, type, order_index)
		VALUES (?, 'Test Section', 'status', 1)
	`, project.ID)
	sectionID, _ := result.LastInsertId()

	taskRepo := NewTaskRepository(db)
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: sectionID,
		Name:            "Test Task",
		Status:          "in progress",
	}
	taskRepo.CreateTask(task)

	subtask := &models.Subtask{TaskID: task.ID, Name: "Subtask", Status: "done"}
	taskRepo.CreateSubtask(subtask)

	// Soft delete
	err := taskRepo.SoftDeleteSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to soft delete subtask: %v", err)
	}

	// Verify not in list
	subtasks, _ := taskRepo.ListSubtasksByTask(task.ID)
	if len(subtasks) != 0 {
		t.Error("expected 0 subtasks after soft delete")
	}

	// But still exists in DB
	retrieved, _ := taskRepo.GetSubtaskByID(subtask.ID)
	if !retrieved.IsDeleted {
		t.Error("expected subtask to be marked as deleted")
	}
}

func TestTaskRepository_UpdateTask(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Setup
	projectRepo := NewProjectRepository(db)
	project := &models.Project{Name: "Test Project"}
	projectRepo.Create(project)

	result, _ := db.Conn.Exec(`
		INSERT INTO report_sections (project_id, name, type, order_index)
		VALUES (?, 'Test Section', 'status', 1)
	`, project.ID)
	sectionID, _ := result.LastInsertId()

	taskRepo := NewTaskRepository(db)
	task := &models.Task{
		ProjectID:       project.ID,
		ReportSectionID: sectionID,
		Name:            "Test Task",
		Status:          "in progress",
	}
	taskRepo.CreateTask(task)

	// Update
	task.Name = "Updated Task"
	task.Status = "done"
	ecd := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	task.ExpectedCompletionDate = &ecd

	err := taskRepo.UpdateTask(task)
	if err != nil {
		t.Fatalf("failed to update task: %v", err)
	}

	// Verify
	retrieved, _ := taskRepo.GetTaskByID(task.ID)
	if retrieved.Name != "Updated Task" {
		t.Errorf("expected name 'Updated Task', got %s", retrieved.Name)
	}
	if retrieved.Status != "done" {
		t.Errorf("expected status 'done', got %s", retrieved.Status)
	}
}

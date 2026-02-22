package services

import (
	"database/sql"
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

// setupTaskServiceTest creates a test database and returns a TaskService
func setupTaskServiceTest(t *testing.T) (*TaskService, *repository.DB) {
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

	// Create schema for tasks and subtasks
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
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
	`
	if _, err := conn.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	taskRepo := repository.NewTaskRepository(db)
	service := NewTaskService(taskRepo, logger)

	return service, db
}

func TestCreateTask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if task.ID == 0 {
		t.Error("expected task ID to be set")
	}
}

func TestCreateTask_EmptyName(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "",
		Status:          "not started",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err == nil {
		t.Error("expected error for empty task name, got nil")
	}
}

func TestCreateTask_WhitespaceName(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "   ",
		Status:          "not started",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err == nil {
		t.Error("expected error for whitespace-only task name, got nil")
	}
}

func TestCreateTask_InvalidSection(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 0,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err == nil {
		t.Error("expected error for invalid section ID, got nil")
	}
}

func TestUpdateTask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task first
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Original Name",
		Status:          "not started",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Update the task
	task.Name = "Updated Name"
	task.Status = "in progress"

	err = service.UpdateTask(task)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify the update
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.Name != "Updated Name" {
		t.Errorf("expected name 'Updated Name', got '%s'", retrieved.Name)
	}
	if retrieved.Status != "in progress" {
		t.Errorf("expected status 'in progress', got '%s'", retrieved.Status)
	}
}

func TestGetTask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Get the task
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if retrieved.Name != task.Name {
		t.Errorf("expected name '%s', got '%s'", task.Name, retrieved.Name)
	}
}

func TestGetTask_NotFound(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	_, err := service.GetTask(999)
	if err == nil {
		t.Error("expected error for non-existent task, got nil")
	}
}

func TestListTasksBySection_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create tasks in different sections
	task1 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task 1",
		Status:          "not started",
		Priority:        0,
	}
	task2 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task 2",
		Status:          "in progress",
		Priority:        1,
	}
	task3 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 2,
		Name:            "Task 3",
		Status:          "done",
		Priority:        0,
	}

	service.CreateTask(task1)
	service.CreateTask(task2)
	service.CreateTask(task3)

	// List tasks for section 1
	tasks, err := service.ListTasksBySection(1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(tasks) != 2 {
		t.Errorf("expected 2 tasks, got %d", len(tasks))
	}
}

func TestMoveTaskToSection_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Move to section 2
	err = service.MoveTaskToSection(task.ID, 2)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify the move
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.ReportSectionID != 2 {
		t.Errorf("expected section ID 2, got %d", retrieved.ReportSectionID)
	}
}

func TestReorderTasks_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create tasks
	task1 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task 1",
		Status:          "not started",
		Priority:        0,
	}
	task2 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task 2",
		Status:          "not started",
		Priority:        1,
	}
	task3 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task 3",
		Status:          "not started",
		Priority:        2,
	}

	service.CreateTask(task1)
	service.CreateTask(task2)
	service.CreateTask(task3)

	// Reorder: task3, task1, task2
	err := service.ReorderTasks(1, []int64{task3.ID, task1.ID, task2.ID})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify priorities
	t1, _ := service.GetTask(task1.ID)
	t2, _ := service.GetTask(task2.ID)
	t3, _ := service.GetTask(task3.ID)

	if t3.Priority != 0 {
		t.Errorf("expected task3 priority 0, got %d", t3.Priority)
	}
	if t1.Priority != 1 {
		t.Errorf("expected task1 priority 1, got %d", t1.Priority)
	}
	if t2.Priority != 2 {
		t.Errorf("expected task2 priority 2, got %d", t2.Priority)
	}
}

func TestSoftDeleteTask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Soft delete
	err = service.SoftDeleteTask(task.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify deletion
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if !retrieved.IsDeleted {
		t.Error("expected task to be marked as deleted")
	}
}

func TestRestoreTask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create and soft delete a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}

	service.CreateTask(task)
	service.SoftDeleteTask(task.ID)

	// Restore
	err := service.RestoreTask(task.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify restoration
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.IsDeleted {
		t.Error("expected task to not be marked as deleted")
	}
}

func TestArchiveTask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "done",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Archive
	err = service.ArchiveTask(task.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify archival
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if !retrieved.IsArchived {
		t.Error("expected task to be marked as archived")
	}
}

func TestSoftDeleteAndRestore_RoundTrip(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "in progress",
		Priority:        5,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	originalID := task.ID
	originalName := task.Name
	originalStatus := task.Status
	originalPriority := task.Priority

	// Soft delete
	err = service.SoftDeleteTask(task.ID)
	if err != nil {
		t.Fatalf("failed to soft delete: %v", err)
	}

	// Restore
	err = service.RestoreTask(task.ID)
	if err != nil {
		t.Fatalf("failed to restore: %v", err)
	}

	// Verify state after round-trip
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.IsDeleted {
		t.Error("expected IsDeleted to be false after restore")
	}
	if retrieved.ID != originalID {
		t.Errorf("expected ID %d, got %d", originalID, retrieved.ID)
	}
	if retrieved.Name != originalName {
		t.Errorf("expected name '%s', got '%s'", originalName, retrieved.Name)
	}
	if retrieved.Status != originalStatus {
		t.Errorf("expected status '%s', got '%s'", originalStatus, retrieved.Status)
	}
	if retrieved.Priority != originalPriority {
		t.Errorf("expected priority %d, got %d", originalPriority, retrieved.Priority)
	}
}

func TestListTasksBySection_ExcludesDeletedAndArchived(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create tasks
	task1 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Active Task",
		Status:          "not started",
		Priority:        0,
	}
	task2 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Deleted Task",
		Status:          "not started",
		Priority:        1,
	}
	task3 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Archived Task",
		Status:          "done",
		Priority:        2,
	}

	service.CreateTask(task1)
	service.CreateTask(task2)
	service.CreateTask(task3)

	// Soft delete task2
	service.SoftDeleteTask(task2.ID)

	// Archive task3
	service.ArchiveTask(task3.ID)

	// List tasks - should only return task1
	tasks, err := service.ListTasksBySection(1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(tasks) != 1 {
		t.Errorf("expected 1 task, got %d", len(tasks))
	}

	if len(tasks) > 0 && tasks[0].Name != "Active Task" {
		t.Errorf("expected 'Active Task', got '%s'", tasks[0].Name)
	}
}

func TestCreateTask_WithExpectedCompletionDate(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	ecd := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)
	task := &models.Task{
		ProjectID:              1,
		ReportSectionID:        1,
		Name:                   "Task with ECD",
		Status:                 "not started",
		ExpectedCompletionDate: &ecd,
		Priority:               0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.ExpectedCompletionDate == nil {
		t.Error("expected ECD to be set")
	} else if !retrieved.ExpectedCompletionDate.Equal(ecd) {
		t.Errorf("expected ECD %v, got %v", ecd, *retrieved.ExpectedCompletionDate)
	}
}

func TestCreateTask_WithURLAndNotes(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task with URL and Notes",
		Status:          "in progress",
		URL:             "https://example.com/task",
		Notes:           "These are some notes about the task",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.URL != task.URL {
		t.Errorf("expected URL '%s', got '%s'", task.URL, retrieved.URL)
	}
	if retrieved.Notes != task.Notes {
		t.Errorf("expected notes '%s', got '%s'", task.Notes, retrieved.Notes)
	}
}

// Subtask Tests

func TestCreateSubtask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task first
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("failed to create parent task: %v", err)
	}

	// Create a subtask
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Test Subtask",
		Status: "not started",
	}

	err = service.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if subtask.ID == 0 {
		t.Error("expected subtask ID to be set")
	}
}

func TestCreateSubtask_EmptyName(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task first
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "",
		Status: "not started",
	}

	err := service.CreateSubtask(subtask)
	if err == nil {
		t.Error("expected error for empty subtask name, got nil")
	}
}

func TestCreateSubtask_WhitespaceName(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task first
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "   ",
		Status: "not started",
	}

	err := service.CreateSubtask(subtask)
	if err == nil {
		t.Error("expected error for whitespace-only subtask name, got nil")
	}
}

func TestUpdateSubtask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create a subtask
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Original Name",
		Status: "not started",
	}
	err := service.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("failed to create subtask: %v", err)
	}

	// Update the subtask
	subtask.Name = "Updated Name"
	subtask.Status = "in progress"

	err = service.UpdateSubtask(subtask)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify the update
	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if retrieved.Name != "Updated Name" {
		t.Errorf("expected name 'Updated Name', got '%s'", retrieved.Name)
	}
	if retrieved.Status != "in progress" {
		t.Errorf("expected status 'in progress', got '%s'", retrieved.Status)
	}
}

func TestGetSubtask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create a subtask
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Test Subtask",
		Status: "not started",
	}
	err := service.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("failed to create subtask: %v", err)
	}

	// Get the subtask
	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if retrieved.Name != subtask.Name {
		t.Errorf("expected name '%s', got '%s'", subtask.Name, retrieved.Name)
	}
}

func TestGetSubtask_NotFound(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	_, err := service.GetSubtask(999)
	if err == nil {
		t.Error("expected error for non-existent subtask, got nil")
	}
}

func TestListSubtasksByTask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create subtasks
	subtask1 := &models.Subtask{
		TaskID: task.ID,
		Name:   "Subtask 1",
		Status: "not started",
	}
	subtask2 := &models.Subtask{
		TaskID: task.ID,
		Name:   "Subtask 2",
		Status: "in progress",
	}

	service.CreateSubtask(subtask1)
	service.CreateSubtask(subtask2)

	// List subtasks
	subtasks, err := service.ListSubtasksByTask(task.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(subtasks) != 2 {
		t.Errorf("expected 2 subtasks, got %d", len(subtasks))
	}
}

func TestSoftDeleteSubtask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create a subtask
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Test Subtask",
		Status: "not started",
	}
	err := service.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("failed to create subtask: %v", err)
	}

	// Soft delete
	err = service.SoftDeleteSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify deletion
	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if !retrieved.IsDeleted {
		t.Error("expected subtask to be marked as deleted")
	}
}

func TestSoftDeleteAllSubtasks_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create multiple subtasks
	subtask1 := &models.Subtask{
		TaskID: task.ID,
		Name:   "Subtask 1",
		Status: "not started",
	}
	subtask2 := &models.Subtask{
		TaskID: task.ID,
		Name:   "Subtask 2",
		Status: "in progress",
	}
	subtask3 := &models.Subtask{
		TaskID: task.ID,
		Name:   "Subtask 3",
		Status: "done",
	}

	service.CreateSubtask(subtask1)
	service.CreateSubtask(subtask2)
	service.CreateSubtask(subtask3)

	// Soft delete all subtasks
	err := service.SoftDeleteAllSubtasks(task.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify all are deleted
	s1, _ := service.GetSubtask(subtask1.ID)
	s2, _ := service.GetSubtask(subtask2.ID)
	s3, _ := service.GetSubtask(subtask3.ID)

	if !s1.IsDeleted || !s2.IsDeleted || !s3.IsDeleted {
		t.Error("expected all subtasks to be marked as deleted")
	}

	// Verify ListSubtasksByTask excludes deleted subtasks
	subtasks, err := service.ListSubtasksByTask(task.ID)
	if err != nil {
		t.Fatalf("failed to list subtasks: %v", err)
	}

	if len(subtasks) != 0 {
		t.Errorf("expected 0 subtasks (all deleted), got %d", len(subtasks))
	}
}

func TestRestoreSubtask_Success(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create and soft delete a subtask
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Test Subtask",
		Status: "not started",
	}
	service.CreateSubtask(subtask)
	service.SoftDeleteSubtask(subtask.ID)

	// Restore
	err := service.RestoreSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify restoration
	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if retrieved.IsDeleted {
		t.Error("expected subtask to not be marked as deleted")
	}
}

func TestSubtaskSoftDeleteAndRestore_RoundTrip(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create a subtask
	ecd := time.Date(2026, 3, 20, 0, 0, 0, 0, time.UTC)
	subtask := &models.Subtask{
		TaskID:                 task.ID,
		Name:                   "Test Subtask",
		Status:                 "in progress",
		ExpectedCompletionDate: &ecd,
		URL:                    "https://example.com/subtask",
		Notes:                  "Some notes",
	}

	err := service.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("failed to create subtask: %v", err)
	}

	originalID := subtask.ID
	originalName := subtask.Name
	originalStatus := subtask.Status
	originalURL := subtask.URL
	originalNotes := subtask.Notes

	// Soft delete
	err = service.SoftDeleteSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to soft delete: %v", err)
	}

	// Restore
	err = service.RestoreSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to restore: %v", err)
	}

	// Verify state after round-trip
	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if retrieved.IsDeleted {
		t.Error("expected IsDeleted to be false after restore")
	}
	if retrieved.ID != originalID {
		t.Errorf("expected ID %d, got %d", originalID, retrieved.ID)
	}
	if retrieved.Name != originalName {
		t.Errorf("expected name '%s', got '%s'", originalName, retrieved.Name)
	}
	if retrieved.Status != originalStatus {
		t.Errorf("expected status '%s', got '%s'", originalStatus, retrieved.Status)
	}
	if retrieved.URL != originalURL {
		t.Errorf("expected URL '%s', got '%s'", originalURL, retrieved.URL)
	}
	if retrieved.Notes != originalNotes {
		t.Errorf("expected notes '%s', got '%s'", originalNotes, retrieved.Notes)
	}
}

func TestListSubtasksByTask_ExcludesDeleted(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create subtasks
	subtask1 := &models.Subtask{
		TaskID: task.ID,
		Name:   "Active Subtask",
		Status: "not started",
	}
	subtask2 := &models.Subtask{
		TaskID: task.ID,
		Name:   "Deleted Subtask",
		Status: "not started",
	}

	service.CreateSubtask(subtask1)
	service.CreateSubtask(subtask2)

	// Soft delete subtask2
	service.SoftDeleteSubtask(subtask2.ID)

	// List subtasks - should only return subtask1
	subtasks, err := service.ListSubtasksByTask(task.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(subtasks) != 1 {
		t.Errorf("expected 1 subtask, got %d", len(subtasks))
	}

	if len(subtasks) > 0 && subtasks[0].Name != "Active Subtask" {
		t.Errorf("expected 'Active Subtask', got '%s'", subtasks[0].Name)
	}
}

func TestCreateSubtask_WithExpectedCompletionDate(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	ecd := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)
	subtask := &models.Subtask{
		TaskID:                 task.ID,
		Name:                   "Subtask with ECD",
		Status:                 "not started",
		ExpectedCompletionDate: &ecd,
	}

	err := service.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if retrieved.ExpectedCompletionDate == nil {
		t.Error("expected ECD to be set")
	} else if !retrieved.ExpectedCompletionDate.Equal(ecd) {
		t.Errorf("expected ECD %v, got %v", ecd, *retrieved.ExpectedCompletionDate)
	}
}

func TestCreateSubtask_WithURLAndNotes(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Subtask with URL and Notes",
		Status: "in progress",
		URL:    "https://example.com/subtask",
		Notes:  "These are some notes about the subtask",
	}

	err := service.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if retrieved.URL != subtask.URL {
		t.Errorf("expected URL '%s', got '%s'", subtask.URL, retrieved.URL)
	}
	if retrieved.Notes != subtask.Notes {
		t.Errorf("expected notes '%s', got '%s'", subtask.Notes, retrieved.Notes)
	}
}

// Property-Based Tests

// Property 5: Task Name Validation
// **Validates: Requirements 3.1**
func TestProperty5_TaskNameValidation(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 5: Task Name Validation",
		prop.ForAll(
			func(name string) bool {
				service, db := setupTaskServiceTest(t)
				defer db.Close()

				// Create task with the generated name
				task := &models.Task{
					ProjectID:       1,
					ReportSectionID: 1,
					Name:            name,
					Status:          "not started",
					Priority:        0,
				}

				err := service.CreateTask(task)

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

// Property 6: Task Section Assignment Validation
// **Validates: Requirements 3.2**
func TestProperty6_TaskSectionAssignmentValidation(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 6: Task Section Assignment Validation",
		prop.ForAll(
			func(sectionID int64) bool {
				service, db := setupTaskServiceTest(t)
				defer db.Close()

				// Create task with the generated section ID
				task := &models.Task{
					ProjectID:       1,
					ReportSectionID: sectionID,
					Name:            "Test Task",
					Status:          "not started",
					Priority:        0,
				}

				err := service.CreateTask(task)

				// If section ID is 0 or negative, should return error
				if sectionID <= 0 {
					return err != nil
				}

				// If section ID is positive (valid), should succeed
				return err == nil
			},
			// Generate section IDs including invalid (0, negative) and valid (positive)
			gen.OneGenOf(
				gen.Const(int64(0)),      // Zero (invalid)
				gen.Int64Range(-100, -1), // Negative (invalid)
				gen.Int64Range(1, 1000),  // Positive (valid)
			),
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 7: Soft Delete and Restore Round-Trip
// **Validates: Requirements 3.18, 3.19, 3.21, 3.22**
func TestProperty7_SoftDeleteAndRestoreRoundTrip(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 7: Soft Delete and Restore Round-Trip",
		prop.ForAll(
			func(isTask bool, name string, status string, priority int) bool {
				service, db := setupTaskServiceTest(t)
				defer db.Close()

				// Ensure name is valid
				if strings.TrimSpace(name) == "" {
					name = "Test Item"
				}

				if isTask {
					// Test with a task
					task := &models.Task{
						ProjectID:       1,
						ReportSectionID: 1,
						Name:            name,
						Status:          status,
						Priority:        priority,
					}

					// Create task
					err := service.CreateTask(task)
					if err != nil {
						return false
					}

					originalID := task.ID
					originalIsDeleted := task.IsDeleted

					// Soft delete
					err = service.SoftDeleteTask(task.ID)
					if err != nil {
						return false
					}

					// Verify it's deleted
					deleted, err := service.GetTask(task.ID)
					if err != nil || !deleted.IsDeleted {
						return false
					}

					// Restore
					err = service.RestoreTask(task.ID)
					if err != nil {
						return false
					}

					// Verify state after round-trip
					restored, err := service.GetTask(task.ID)
					if err != nil {
						return false
					}

					// Check that is_deleted is false (same as before soft delete)
					return !restored.IsDeleted &&
						restored.IsDeleted == originalIsDeleted &&
						restored.ID == originalID &&
						restored.Name == name &&
						restored.Status == status &&
						restored.Priority == priority
				} else {
					// Test with a subtask
					// First create a parent task
					task := &models.Task{
						ProjectID:       1,
						ReportSectionID: 1,
						Name:            "Parent Task",
						Status:          "not started",
						Priority:        0,
					}
					err := service.CreateTask(task)
					if err != nil {
						return false
					}

					subtask := &models.Subtask{
						TaskID: task.ID,
						Name:   name,
						Status: status,
					}

					// Create subtask
					err = service.CreateSubtask(subtask)
					if err != nil {
						return false
					}

					originalID := subtask.ID
					originalIsDeleted := subtask.IsDeleted

					// Soft delete
					err = service.SoftDeleteSubtask(subtask.ID)
					if err != nil {
						return false
					}

					// Verify it's deleted
					deleted, err := service.GetSubtask(subtask.ID)
					if err != nil || !deleted.IsDeleted {
						return false
					}

					// Restore
					err = service.RestoreSubtask(subtask.ID)
					if err != nil {
						return false
					}

					// Verify state after round-trip
					restored, err := service.GetSubtask(subtask.ID)
					if err != nil {
						return false
					}

					// Check that is_deleted is false (same as before soft delete)
					return !restored.IsDeleted &&
						restored.IsDeleted == originalIsDeleted &&
						restored.ID == originalID &&
						restored.Name == name &&
						restored.Status == status
				}
			},
			gen.Bool(), // isTask: true for task, false for subtask
			gen.AlphaString().SuchThat(func(s string) bool {
				return len(s) > 0 && len(s) < 100
			}), // name
			gen.OneConstOf("not started", "in progress", "in review", "done"), // status
			gen.IntRange(0, 100), // priority (only used for tasks)
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Additional Unit Tests for Task Service

// Error Handling Tests

func TestMoveTaskToSection_InvalidSection(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Try to move to invalid section (0)
	err := service.MoveTaskToSection(task.ID, 0)
	if err == nil {
		t.Error("expected error when moving to invalid section, got nil")
	}

	// Try to move to invalid section (negative)
	err = service.MoveTaskToSection(task.ID, -1)
	if err == nil {
		t.Error("expected error when moving to negative section, got nil")
	}
}

func TestMoveTaskToSection_NonExistentTask(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Try to move non-existent task
	err := service.MoveTaskToSection(999, 1)
	if err == nil {
		t.Error("expected error when moving non-existent task, got nil")
	}
}

func TestReorderTasks_TaskNotInSection(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create tasks in different sections
	task1 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task in Section 1",
		Status:          "not started",
		Priority:        0,
	}
	task2 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 2,
		Name:            "Task in Section 2",
		Status:          "not started",
		Priority:        0,
	}

	service.CreateTask(task1)
	service.CreateTask(task2)

	// Try to reorder with task from different section
	err := service.ReorderTasks(1, []int64{task1.ID, task2.ID})
	if err == nil {
		t.Error("expected error when reordering task from different section, got nil")
	}
}

func TestReorderTasks_NonExistentTask(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Try to reorder with non-existent task
	err := service.ReorderTasks(1, []int64{task.ID, 999})
	if err == nil {
		t.Error("expected error when reordering with non-existent task, got nil")
	}
}

func TestReorderTasks_EmptyList(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Reorder with empty list should succeed (no-op)
	err := service.ReorderTasks(1, []int64{})
	if err != nil {
		t.Errorf("expected no error for empty reorder list, got %v", err)
	}
}

func TestSoftDeleteTask_NonExistent(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Try to soft delete non-existent task
	err := service.SoftDeleteTask(999)
	if err == nil {
		t.Error("expected error when soft deleting non-existent task, got nil")
	}
}

func TestRestoreTask_NonExistent(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Try to restore non-existent task
	err := service.RestoreTask(999)
	if err == nil {
		t.Error("expected error when restoring non-existent task, got nil")
	}
}

func TestArchiveTask_NonExistent(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Try to archive non-existent task
	err := service.ArchiveTask(999)
	if err == nil {
		t.Error("expected error when archiving non-existent task, got nil")
	}
}

func TestUpdateTask_EmptyName(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Original Name",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Try to update with empty name
	task.Name = ""
	err := service.UpdateTask(task)
	if err == nil {
		t.Error("expected error when updating with empty name, got nil")
	}
}

func TestUpdateTask_InvalidSection(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Try to update with invalid section
	task.ReportSectionID = 0
	err := service.UpdateTask(task)
	if err == nil {
		t.Error("expected error when updating with invalid section, got nil")
	}
}

func TestSoftDeleteSubtask_NonExistent(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Try to soft delete non-existent subtask
	err := service.SoftDeleteSubtask(999)
	if err == nil {
		t.Error("expected error when soft deleting non-existent subtask, got nil")
	}
}

func TestRestoreSubtask_NonExistent(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Try to restore non-existent subtask
	err := service.RestoreSubtask(999)
	if err == nil {
		t.Error("expected error when restoring non-existent subtask, got nil")
	}
}

func TestUpdateSubtask_EmptyName(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create a subtask
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Original Name",
		Status: "not started",
	}
	service.CreateSubtask(subtask)

	// Try to update with empty name
	subtask.Name = ""
	err := service.UpdateSubtask(subtask)
	if err == nil {
		t.Error("expected error when updating subtask with empty name, got nil")
	}
}

func TestSoftDeleteAllSubtasks_NoSubtasks(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task with no subtasks
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task with no subtasks",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Soft delete all subtasks (should succeed even with no subtasks)
	err := service.SoftDeleteAllSubtasks(task.ID)
	if err != nil {
		t.Errorf("expected no error when soft deleting all subtasks of task with no subtasks, got %v", err)
	}
}

// Move and Reorder Operation Tests

func TestMoveTaskToSection_PreservesPriority(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task with specific priority
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        5,
	}
	service.CreateTask(task)

	// Move to different section
	err := service.MoveTaskToSection(task.ID, 2)
	if err != nil {
		t.Fatalf("failed to move task: %v", err)
	}

	// Verify priority is preserved
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.Priority != 5 {
		t.Errorf("expected priority 5 to be preserved, got %d", retrieved.Priority)
	}
}

func TestMoveTaskToSection_PreservesOtherFields(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task with all fields populated
	ecd := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)
	task := &models.Task{
		ProjectID:              1,
		ReportSectionID:        1,
		Name:                   "Test Task",
		Status:                 "in progress",
		ExpectedCompletionDate: &ecd,
		URL:                    "https://example.com",
		Notes:                  "Some notes",
		Priority:               3,
	}
	service.CreateTask(task)

	// Move to different section
	err := service.MoveTaskToSection(task.ID, 2)
	if err != nil {
		t.Fatalf("failed to move task: %v", err)
	}

	// Verify all other fields are preserved
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.Name != task.Name {
		t.Errorf("expected name '%s', got '%s'", task.Name, retrieved.Name)
	}
	if retrieved.Status != task.Status {
		t.Errorf("expected status '%s', got '%s'", task.Status, retrieved.Status)
	}
	if retrieved.URL != task.URL {
		t.Errorf("expected URL '%s', got '%s'", task.URL, retrieved.URL)
	}
	if retrieved.Notes != task.Notes {
		t.Errorf("expected notes '%s', got '%s'", task.Notes, retrieved.Notes)
	}
	if retrieved.Priority != task.Priority {
		t.Errorf("expected priority %d, got %d", task.Priority, retrieved.Priority)
	}
	if retrieved.ReportSectionID != 2 {
		t.Errorf("expected section ID 2, got %d", retrieved.ReportSectionID)
	}
}

func TestReorderTasks_SingleTask(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a single task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Single Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Reorder with single task
	err := service.ReorderTasks(1, []int64{task.ID})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify priority is 0
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.Priority != 0 {
		t.Errorf("expected priority 0, got %d", retrieved.Priority)
	}
}

func TestReorderTasks_LargeList(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create 10 tasks
	taskIDs := make([]int64, 10)
	for i := 0; i < 10; i++ {
		task := &models.Task{
			ProjectID:       1,
			ReportSectionID: 1,
			Name:            "Task",
			Status:          "not started",
			Priority:        i,
		}
		service.CreateTask(task)
		taskIDs[i] = task.ID
	}

	// Reverse the order
	reversedIDs := make([]int64, 10)
	for i := 0; i < 10; i++ {
		reversedIDs[i] = taskIDs[9-i]
	}

	// Reorder
	err := service.ReorderTasks(1, reversedIDs)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify priorities are updated correctly
	for i, id := range reversedIDs {
		retrieved, err := service.GetTask(id)
		if err != nil {
			t.Fatalf("failed to get task %d: %v", id, err)
		}
		if retrieved.Priority != i {
			t.Errorf("task %d: expected priority %d, got %d", id, i, retrieved.Priority)
		}
	}
}

func TestListTasksBySection_OrderedByPriority(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create tasks with different priorities
	task1 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task Priority 2",
		Status:          "not started",
		Priority:        2,
	}
	task2 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task Priority 0",
		Status:          "not started",
		Priority:        0,
	}
	task3 := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task Priority 1",
		Status:          "not started",
		Priority:        1,
	}

	service.CreateTask(task1)
	service.CreateTask(task2)
	service.CreateTask(task3)

	// List tasks
	tasks, err := service.ListTasksBySection(1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify they are ordered by priority
	if len(tasks) != 3 {
		t.Fatalf("expected 3 tasks, got %d", len(tasks))
	}

	if tasks[0].Priority != 0 {
		t.Errorf("expected first task priority 0, got %d", tasks[0].Priority)
	}
	if tasks[1].Priority != 1 {
		t.Errorf("expected second task priority 1, got %d", tasks[1].Priority)
	}
	if tasks[2].Priority != 2 {
		t.Errorf("expected third task priority 2, got %d", tasks[2].Priority)
	}
}

func TestMoveTaskToSection_MultipleTimes(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Move to section 2
	err := service.MoveTaskToSection(task.ID, 2)
	if err != nil {
		t.Fatalf("failed to move to section 2: %v", err)
	}

	// Move to section 3
	err = service.MoveTaskToSection(task.ID, 3)
	if err != nil {
		t.Fatalf("failed to move to section 3: %v", err)
	}

	// Move back to section 1
	err = service.MoveTaskToSection(task.ID, 1)
	if err != nil {
		t.Fatalf("failed to move back to section 1: %v", err)
	}

	// Verify final section
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.ReportSectionID != 1 {
		t.Errorf("expected section ID 1, got %d", retrieved.ReportSectionID)
	}
}

// Edge Case Tests

func TestCreateTask_WithNilExpectedCompletionDate(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	task := &models.Task{
		ProjectID:              1,
		ReportSectionID:        1,
		Name:                   "Task without ECD",
		Status:                 "not started",
		ExpectedCompletionDate: nil,
		Priority:               0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.ExpectedCompletionDate != nil {
		t.Error("expected ECD to be nil")
	}
}

func TestCreateSubtask_WithNilExpectedCompletionDate(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	subtask := &models.Subtask{
		TaskID:                 task.ID,
		Name:                   "Subtask without ECD",
		Status:                 "not started",
		ExpectedCompletionDate: nil,
	}

	err := service.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if retrieved.ExpectedCompletionDate != nil {
		t.Error("expected ECD to be nil")
	}
}

func TestCreateTask_WithEmptyURLAndNotes(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Task with empty fields",
		Status:          "not started",
		URL:             "",
		Notes:           "",
		Priority:        0,
	}

	err := service.CreateTask(task)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.URL != "" {
		t.Errorf("expected empty URL, got '%s'", retrieved.URL)
	}
	if retrieved.Notes != "" {
		t.Errorf("expected empty notes, got '%s'", retrieved.Notes)
	}
}

func TestCreateSubtask_WithEmptyURLAndNotes(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Subtask with empty fields",
		Status: "not started",
		URL:    "",
		Notes:  "",
	}

	err := service.CreateSubtask(subtask)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if retrieved.URL != "" {
		t.Errorf("expected empty URL, got '%s'", retrieved.URL)
	}
	if retrieved.Notes != "" {
		t.Errorf("expected empty notes, got '%s'", retrieved.Notes)
	}
}

func TestRestoreTask_AlreadyRestored(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task (not deleted)
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Try to restore a task that's not deleted (should succeed as no-op)
	err := service.RestoreTask(task.ID)
	if err != nil {
		t.Errorf("expected no error when restoring non-deleted task, got %v", err)
	}

	// Verify it's still not deleted
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if retrieved.IsDeleted {
		t.Error("expected task to not be deleted")
	}
}

func TestRestoreSubtask_AlreadyRestored(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create parent task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Parent Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Create a subtask (not deleted)
	subtask := &models.Subtask{
		TaskID: task.ID,
		Name:   "Test Subtask",
		Status: "not started",
	}
	service.CreateSubtask(subtask)

	// Try to restore a subtask that's not deleted (should succeed as no-op)
	err := service.RestoreSubtask(subtask.ID)
	if err != nil {
		t.Errorf("expected no error when restoring non-deleted subtask, got %v", err)
	}

	// Verify it's still not deleted
	retrieved, err := service.GetSubtask(subtask.ID)
	if err != nil {
		t.Fatalf("failed to get subtask: %v", err)
	}

	if retrieved.IsDeleted {
		t.Error("expected subtask to not be deleted")
	}
}

func TestSoftDeleteTask_MultipleTimes(t *testing.T) {
	service, db := setupTaskServiceTest(t)
	defer db.Close()

	// Create a task
	task := &models.Task{
		ProjectID:       1,
		ReportSectionID: 1,
		Name:            "Test Task",
		Status:          "not started",
		Priority:        0,
	}
	service.CreateTask(task)

	// Soft delete once
	err := service.SoftDeleteTask(task.ID)
	if err != nil {
		t.Fatalf("failed to soft delete: %v", err)
	}

	// Soft delete again (should succeed as no-op)
	err = service.SoftDeleteTask(task.ID)
	if err != nil {
		t.Errorf("expected no error when soft deleting already deleted task, got %v", err)
	}

	// Verify it's still deleted
	retrieved, err := service.GetTask(task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}

	if !retrieved.IsDeleted {
		t.Error("expected task to be deleted")
	}
}

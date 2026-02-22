package repository

import (
	"database/sql"
	"fmt"
	"time"

	"src/backend/models"

	"go.uber.org/zap"
)

// TaskRepository handles database operations for tasks and subtasks
type TaskRepository struct {
	db     *DB
	logger *zap.Logger
}

// NewTaskRepository creates a new TaskRepository
func NewTaskRepository(db *DB) *TaskRepository {
	return &TaskRepository{
		db:     db,
		logger: db.Logger,
	}
}

// CreateTask inserts a new task into the database
func (r *TaskRepository) CreateTask(task *models.Task) error {
	r.logger.Info("creating task",
		zap.String("name", task.Name),
		zap.Int64("project_id", task.ProjectID),
	)

	query := `
		INSERT INTO tasks (
			project_id, report_section_id, name, status, expected_completion_date,
			url, notes, priority, is_deleted, is_archived, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	now := time.Now()
	result, err := r.db.Conn.Exec(
		query,
		task.ProjectID,
		task.ReportSectionID,
		task.Name,
		task.Status,
		task.ExpectedCompletionDate,
		task.URL,
		task.Notes,
		task.Priority,
		task.IsDeleted,
		task.IsArchived,
		now,
		now,
	)
	if err != nil {
		r.logger.Error("failed to create task", zap.Error(err))
		return fmt.Errorf("failed to create task: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %w", err)
	}

	task.ID = id
	task.CreatedAt = now
	task.UpdatedAt = now

	r.logger.Info("task created successfully",
		zap.Int64("id", task.ID),
	)

	return nil
}

// UpdateTask updates an existing task
func (r *TaskRepository) UpdateTask(task *models.Task) error {
	r.logger.Info("updating task",
		zap.Int64("id", task.ID),
	)

	query := `
		UPDATE tasks SET
			report_section_id = ?,
			name = ?,
			status = ?,
			expected_completion_date = ?,
			url = ?,
			notes = ?,
			priority = ?,
			is_deleted = ?,
			is_archived = ?,
			updated_at = ?
		WHERE id = ?
	`

	now := time.Now()
	result, err := r.db.Conn.Exec(
		query,
		task.ReportSectionID,
		task.Name,
		task.Status,
		task.ExpectedCompletionDate,
		task.URL,
		task.Notes,
		task.Priority,
		task.IsDeleted,
		task.IsArchived,
		now,
		task.ID,
	)
	if err != nil {
		r.logger.Error("failed to update task", zap.Error(err))
		return fmt.Errorf("failed to update task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found: %d", task.ID)
	}

	task.UpdatedAt = now

	r.logger.Info("task updated successfully",
		zap.Int64("id", task.ID),
	)

	return nil
}

// GetTaskByID retrieves a task by its ID
func (r *TaskRepository) GetTaskByID(id int64) (*models.Task, error) {
	query := `
		SELECT id, project_id, report_section_id, name, status, expected_completion_date,
			url, notes, priority, is_deleted, is_archived, created_at, updated_at
		FROM tasks
		WHERE id = ?
	`

	task := &models.Task{}
	err := r.db.Conn.QueryRow(query, id).Scan(
		&task.ID,
		&task.ProjectID,
		&task.ReportSectionID,
		&task.Name,
		&task.Status,
		&task.ExpectedCompletionDate,
		&task.URL,
		&task.Notes,
		&task.Priority,
		&task.IsDeleted,
		&task.IsArchived,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("task not found: %d", id)
	}
	if err != nil {
		r.logger.Error("failed to get task", zap.Error(err))
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	return task, nil
}

// ListTasksBySection retrieves all tasks for a section (not deleted, not archived)
func (r *TaskRepository) ListTasksBySection(sectionID int64) ([]*models.Task, error) {
	query := `
		SELECT id, project_id, report_section_id, name, status, expected_completion_date,
			url, notes, priority, is_deleted, is_archived, created_at, updated_at
		FROM tasks
		WHERE report_section_id = ? AND is_deleted = 0 AND is_archived = 0
		ORDER BY priority ASC, created_at ASC
	`

	rows, err := r.db.Conn.Query(query, sectionID)
	if err != nil {
		r.logger.Error("failed to list tasks by section", zap.Error(err))
		return nil, fmt.Errorf("failed to list tasks by section: %w", err)
	}
	defer rows.Close()

	tasks := []*models.Task{}
	for rows.Next() {
		task := &models.Task{}
		err := rows.Scan(
			&task.ID,
			&task.ProjectID,
			&task.ReportSectionID,
			&task.Name,
			&task.Status,
			&task.ExpectedCompletionDate,
			&task.URL,
			&task.Notes,
			&task.Priority,
			&task.IsDeleted,
			&task.IsArchived,
			&task.CreatedAt,
			&task.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		tasks = append(tasks, task)
	}

	return tasks, rows.Err()
}

// SoftDeleteTask marks a task as deleted
func (r *TaskRepository) SoftDeleteTask(id int64) error {
	r.logger.Info("soft deleting task",
		zap.Int64("id", id),
	)

	query := `UPDATE tasks SET is_deleted = 1, updated_at = ? WHERE id = ?`
	result, err := r.db.Conn.Exec(query, time.Now(), id)
	if err != nil {
		r.logger.Error("failed to soft delete task", zap.Error(err))
		return fmt.Errorf("failed to soft delete task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found: %d", id)
	}

	return nil
}

// RestoreTask restores a soft-deleted task
func (r *TaskRepository) RestoreTask(id int64) error {
	r.logger.Info("restoring task",
		zap.Int64("id", id),
	)

	query := `UPDATE tasks SET is_deleted = 0, updated_at = ? WHERE id = ?`
	result, err := r.db.Conn.Exec(query, time.Now(), id)
	if err != nil {
		r.logger.Error("failed to restore task", zap.Error(err))
		return fmt.Errorf("failed to restore task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found: %d", id)
	}

	return nil
}

// CreateSubtask inserts a new subtask
func (r *TaskRepository) CreateSubtask(subtask *models.Subtask) error {
	r.logger.Info("creating subtask",
		zap.String("name", subtask.Name),
		zap.Int64("task_id", subtask.TaskID),
	)

	query := `
		INSERT INTO subtasks (
			task_id, name, status, expected_completion_date,
			url, notes, is_deleted, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	now := time.Now()
	result, err := r.db.Conn.Exec(
		query,
		subtask.TaskID,
		subtask.Name,
		subtask.Status,
		subtask.ExpectedCompletionDate,
		subtask.URL,
		subtask.Notes,
		subtask.IsDeleted,
		now,
		now,
	)
	if err != nil {
		r.logger.Error("failed to create subtask", zap.Error(err))
		return fmt.Errorf("failed to create subtask: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %w", err)
	}

	subtask.ID = id
	subtask.CreatedAt = now
	subtask.UpdatedAt = now

	return nil
}

// UpdateSubtask updates an existing subtask
func (r *TaskRepository) UpdateSubtask(subtask *models.Subtask) error {
	query := `
		UPDATE subtasks SET
			name = ?,
			status = ?,
			expected_completion_date = ?,
			url = ?,
			notes = ?,
			is_deleted = ?,
			updated_at = ?
		WHERE id = ?
	`

	now := time.Now()
	result, err := r.db.Conn.Exec(
		query,
		subtask.Name,
		subtask.Status,
		subtask.ExpectedCompletionDate,
		subtask.URL,
		subtask.Notes,
		subtask.IsDeleted,
		now,
		subtask.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update subtask: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("subtask not found: %d", subtask.ID)
	}

	subtask.UpdatedAt = now
	return nil
}

// GetSubtaskByID retrieves a subtask by its ID
func (r *TaskRepository) GetSubtaskByID(id int64) (*models.Subtask, error) {
	query := `
		SELECT id, task_id, name, status, expected_completion_date,
			url, notes, is_deleted, created_at, updated_at
		FROM subtasks
		WHERE id = ?
	`

	subtask := &models.Subtask{}
	err := r.db.Conn.QueryRow(query, id).Scan(
		&subtask.ID,
		&subtask.TaskID,
		&subtask.Name,
		&subtask.Status,
		&subtask.ExpectedCompletionDate,
		&subtask.URL,
		&subtask.Notes,
		&subtask.IsDeleted,
		&subtask.CreatedAt,
		&subtask.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("subtask not found: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get subtask: %w", err)
	}

	return subtask, nil
}

// ListSubtasksByTask retrieves all subtasks for a task (not deleted)
func (r *TaskRepository) ListSubtasksByTask(taskID int64) ([]*models.Subtask, error) {
	query := `
		SELECT id, task_id, name, status, expected_completion_date,
			url, notes, is_deleted, created_at, updated_at
		FROM subtasks
		WHERE task_id = ? AND is_deleted = 0
		ORDER BY created_at ASC
	`

	rows, err := r.db.Conn.Query(query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to list subtasks: %w", err)
	}
	defer rows.Close()

	subtasks := []*models.Subtask{}
	for rows.Next() {
		subtask := &models.Subtask{}
		err := rows.Scan(
			&subtask.ID,
			&subtask.TaskID,
			&subtask.Name,
			&subtask.Status,
			&subtask.ExpectedCompletionDate,
			&subtask.URL,
			&subtask.Notes,
			&subtask.IsDeleted,
			&subtask.CreatedAt,
			&subtask.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan subtask: %w", err)
		}
		subtasks = append(subtasks, subtask)
	}

	return subtasks, rows.Err()
}

// SoftDeleteSubtask marks a subtask as deleted
func (r *TaskRepository) SoftDeleteSubtask(id int64) error {
	query := `UPDATE subtasks SET is_deleted = 1, updated_at = ? WHERE id = ?`
	result, err := r.db.Conn.Exec(query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to soft delete subtask: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("subtask not found: %d", id)
	}

	return nil
}

// SoftDeleteAllSubtasks marks all subtasks of a task as deleted
func (r *TaskRepository) SoftDeleteAllSubtasks(taskID int64) error {
	query := `UPDATE subtasks SET is_deleted = 1, updated_at = ? WHERE task_id = ?`
	_, err := r.db.Conn.Exec(query, time.Now(), taskID)
	if err != nil {
		return fmt.Errorf("failed to soft delete all subtasks: %w", err)
	}

	return nil
}

// RestoreSubtask restores a soft-deleted subtask
func (r *TaskRepository) RestoreSubtask(id int64) error {
	query := `UPDATE subtasks SET is_deleted = 0, updated_at = ? WHERE id = ?`
	result, err := r.db.Conn.Exec(query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to restore subtask: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("subtask not found: %d", id)
	}

	return nil
}

// ListTasksByProject retrieves all tasks for a project (not deleted, not archived)
func (r *TaskRepository) ListTasksByProject(projectID int64) ([]*models.Task, error) {
	query := `
		SELECT id, project_id, report_section_id, name, status, expected_completion_date,
			url, notes, priority, is_deleted, is_archived, created_at, updated_at
		FROM tasks
		WHERE project_id = ? AND is_deleted = 0 AND is_archived = 0
		ORDER BY report_section_id ASC, priority ASC, created_at ASC
	`

	rows, err := r.db.Conn.Query(query, projectID)
	if err != nil {
		r.logger.Error("failed to list tasks by project", zap.Error(err))
		return nil, fmt.Errorf("failed to list tasks by project: %w", err)
	}
	defer rows.Close()

	tasks := []*models.Task{}
	for rows.Next() {
		task := &models.Task{}
		err := rows.Scan(
			&task.ID,
			&task.ProjectID,
			&task.ReportSectionID,
			&task.Name,
			&task.Status,
			&task.ExpectedCompletionDate,
			&task.URL,
			&task.Notes,
			&task.Priority,
			&task.IsDeleted,
			&task.IsArchived,
			&task.CreatedAt,
			&task.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		tasks = append(tasks, task)
	}

	return tasks, rows.Err()
}

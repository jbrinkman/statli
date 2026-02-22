package services

import (
	"fmt"
	"strings"

	"src/backend/models"
	"src/backend/repository"

	"go.uber.org/zap"
)

// TaskService handles business logic for task and subtask operations
type TaskService struct {
	repo   *repository.TaskRepository
	logger *zap.Logger
}

// NewTaskService creates a new TaskService
func NewTaskService(repo *repository.TaskRepository, logger *zap.Logger) *TaskService {
	return &TaskService{
		repo:   repo,
		logger: logger,
	}
}

// CreateTask creates a new task with validation
func (s *TaskService) CreateTask(task *models.Task) error {
	s.logger.Info("creating task",
		zap.String("name", task.Name),
		zap.Int64("project_id", task.ProjectID),
		zap.Int64("section_id", task.ReportSectionID),
	)

	// Validate task name
	if err := s.validateTaskName(task.Name); err != nil {
		s.logger.Error("task name validation failed",
			zap.Error(err),
			zap.String("name", task.Name),
		)
		return err
	}

	// Validate section assignment
	if err := s.validateSectionAssignment(task.ReportSectionID); err != nil {
		s.logger.Error("section assignment validation failed",
			zap.Error(err),
			zap.Int64("section_id", task.ReportSectionID),
		)
		return err
	}

	// Create task in repository
	if err := s.repo.CreateTask(task); err != nil {
		s.logger.Error("failed to create task in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("task created successfully",
		zap.Int64("id", task.ID),
		zap.String("name", task.Name),
	)

	return nil
}

// UpdateTask updates an existing task with validation
func (s *TaskService) UpdateTask(task *models.Task) error {
	s.logger.Info("updating task",
		zap.Int64("id", task.ID),
		zap.String("name", task.Name),
	)

	// Validate task name
	if err := s.validateTaskName(task.Name); err != nil {
		s.logger.Error("task name validation failed",
			zap.Error(err),
			zap.String("name", task.Name),
		)
		return err
	}

	// Validate section assignment
	if err := s.validateSectionAssignment(task.ReportSectionID); err != nil {
		s.logger.Error("section assignment validation failed",
			zap.Error(err),
			zap.Int64("section_id", task.ReportSectionID),
		)
		return err
	}

	// Update task in repository
	if err := s.repo.UpdateTask(task); err != nil {
		s.logger.Error("failed to update task in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("task updated successfully",
		zap.Int64("id", task.ID),
	)

	return nil
}

// GetTask retrieves a task by ID
func (s *TaskService) GetTask(id int64) (*models.Task, error) {
	s.logger.Debug("getting task",
		zap.Int64("id", id),
	)

	task, err := s.repo.GetTaskByID(id)
	if err != nil {
		s.logger.Error("failed to get task",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return nil, err
	}

	return task, nil
}

// ListTasksBySection retrieves all tasks for a section (not deleted, not archived)
func (s *TaskService) ListTasksBySection(sectionID int64) ([]*models.Task, error) {
	s.logger.Debug("listing tasks by section",
		zap.Int64("section_id", sectionID),
	)

	tasks, err := s.repo.ListTasksBySection(sectionID)
	if err != nil {
		s.logger.Error("failed to list tasks by section",
			zap.Error(err),
			zap.Int64("section_id", sectionID),
		)
		return nil, err
	}

	s.logger.Debug("listed tasks by section",
		zap.Int("count", len(tasks)),
		zap.Int64("section_id", sectionID),
	)

	return tasks, nil
}

// MoveTaskToSection moves a task to a different section
func (s *TaskService) MoveTaskToSection(taskID, sectionID int64) error {
	s.logger.Info("moving task to section",
		zap.Int64("task_id", taskID),
		zap.Int64("section_id", sectionID),
	)

	// Validate section assignment
	if err := s.validateSectionAssignment(sectionID); err != nil {
		s.logger.Error("section assignment validation failed",
			zap.Error(err),
			zap.Int64("section_id", sectionID),
		)
		return err
	}

	// Get the task
	task, err := s.repo.GetTaskByID(taskID)
	if err != nil {
		s.logger.Error("failed to get task for move",
			zap.Error(err),
			zap.Int64("task_id", taskID),
		)
		return err
	}

	// Update the section
	task.ReportSectionID = sectionID

	// Update in repository
	if err := s.repo.UpdateTask(task); err != nil {
		s.logger.Error("failed to move task to section",
			zap.Error(err),
			zap.Int64("task_id", taskID),
			zap.Int64("section_id", sectionID),
		)
		return err
	}

	s.logger.Info("task moved to section successfully",
		zap.Int64("task_id", taskID),
		zap.Int64("section_id", sectionID),
	)

	return nil
}

// ReorderTasks reorders tasks within a section by updating their priority
func (s *TaskService) ReorderTasks(sectionID int64, taskIDs []int64) error {
	s.logger.Info("reordering tasks",
		zap.Int64("section_id", sectionID),
		zap.Int("task_count", len(taskIDs)),
	)

	// Update priority for each task based on its position in the array
	for i, taskID := range taskIDs {
		task, err := s.repo.GetTaskByID(taskID)
		if err != nil {
			s.logger.Error("failed to get task for reorder",
				zap.Error(err),
				zap.Int64("task_id", taskID),
			)
			return fmt.Errorf("failed to get task %d: %w", taskID, err)
		}

		// Verify task belongs to the section
		if task.ReportSectionID != sectionID {
			s.logger.Error("task does not belong to section",
				zap.Int64("task_id", taskID),
				zap.Int64("task_section_id", task.ReportSectionID),
				zap.Int64("target_section_id", sectionID),
			)
			return fmt.Errorf("task %d does not belong to section %d", taskID, sectionID)
		}

		// Update priority (0-indexed)
		task.Priority = i

		if err := s.repo.UpdateTask(task); err != nil {
			s.logger.Error("failed to update task priority",
				zap.Error(err),
				zap.Int64("task_id", taskID),
				zap.Int("priority", i),
			)
			return fmt.Errorf("failed to update task %d priority: %w", taskID, err)
		}
	}

	s.logger.Info("tasks reordered successfully",
		zap.Int64("section_id", sectionID),
		zap.Int("task_count", len(taskIDs)),
	)

	return nil
}

// SoftDeleteTask marks a task as deleted
func (s *TaskService) SoftDeleteTask(id int64) error {
	s.logger.Info("soft deleting task",
		zap.Int64("id", id),
	)

	if err := s.repo.SoftDeleteTask(id); err != nil {
		s.logger.Error("failed to soft delete task",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return err
	}

	s.logger.Info("task soft deleted successfully",
		zap.Int64("id", id),
	)

	return nil
}

// RestoreTask restores a soft-deleted task
func (s *TaskService) RestoreTask(id int64) error {
	s.logger.Info("restoring task",
		zap.Int64("id", id),
	)

	if err := s.repo.RestoreTask(id); err != nil {
		s.logger.Error("failed to restore task",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return err
	}

	s.logger.Info("task restored successfully",
		zap.Int64("id", id),
	)

	return nil
}

// ArchiveTask marks a task as archived
func (s *TaskService) ArchiveTask(id int64) error {
	s.logger.Info("archiving task",
		zap.Int64("id", id),
	)

	// Get the task
	task, err := s.repo.GetTaskByID(id)
	if err != nil {
		s.logger.Error("failed to get task for archive",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return err
	}

	// Mark as archived
	task.IsArchived = true

	// Update in repository
	if err := s.repo.UpdateTask(task); err != nil {
		s.logger.Error("failed to archive task",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return err
	}

	s.logger.Info("task archived successfully",
		zap.Int64("id", id),
	)

	return nil
}

// validateTaskName validates that a task name is not empty or whitespace-only
func (s *TaskService) validateTaskName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return fmt.Errorf("task name cannot be empty or whitespace-only")
	}
	return nil
}

// validateSectionAssignment validates that a section ID is provided
func (s *TaskService) validateSectionAssignment(sectionID int64) error {
	if sectionID <= 0 {
		return fmt.Errorf("task must be assigned to a valid report section")
	}
	return nil
}

// CreateSubtask creates a new subtask with validation
func (s *TaskService) CreateSubtask(subtask *models.Subtask) error {
	s.logger.Info("creating subtask",
		zap.String("name", subtask.Name),
		zap.Int64("task_id", subtask.TaskID),
	)

	// Validate subtask name
	if err := s.validateSubtaskName(subtask.Name); err != nil {
		s.logger.Error("subtask name validation failed",
			zap.Error(err),
			zap.String("name", subtask.Name),
		)
		return err
	}

	// Create subtask in repository
	if err := s.repo.CreateSubtask(subtask); err != nil {
		s.logger.Error("failed to create subtask in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("subtask created successfully",
		zap.Int64("id", subtask.ID),
		zap.String("name", subtask.Name),
	)

	return nil
}

// UpdateSubtask updates an existing subtask with validation
func (s *TaskService) UpdateSubtask(subtask *models.Subtask) error {
	s.logger.Info("updating subtask",
		zap.Int64("id", subtask.ID),
		zap.String("name", subtask.Name),
	)

	// Validate subtask name
	if err := s.validateSubtaskName(subtask.Name); err != nil {
		s.logger.Error("subtask name validation failed",
			zap.Error(err),
			zap.String("name", subtask.Name),
		)
		return err
	}

	// Update subtask in repository
	if err := s.repo.UpdateSubtask(subtask); err != nil {
		s.logger.Error("failed to update subtask in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("subtask updated successfully",
		zap.Int64("id", subtask.ID),
	)

	return nil
}

// GetSubtask retrieves a subtask by ID
func (s *TaskService) GetSubtask(id int64) (*models.Subtask, error) {
	s.logger.Debug("getting subtask",
		zap.Int64("id", id),
	)

	subtask, err := s.repo.GetSubtaskByID(id)
	if err != nil {
		s.logger.Error("failed to get subtask",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return nil, err
	}

	return subtask, nil
}

// ListSubtasksByTask retrieves all subtasks for a task (not deleted)
func (s *TaskService) ListSubtasksByTask(taskID int64) ([]*models.Subtask, error) {
	s.logger.Debug("listing subtasks by task",
		zap.Int64("task_id", taskID),
	)

	subtasks, err := s.repo.ListSubtasksByTask(taskID)
	if err != nil {
		s.logger.Error("failed to list subtasks by task",
			zap.Error(err),
			zap.Int64("task_id", taskID),
		)
		return nil, err
	}

	s.logger.Debug("listed subtasks by task",
		zap.Int("count", len(subtasks)),
		zap.Int64("task_id", taskID),
	)

	return subtasks, nil
}

// SoftDeleteSubtask marks a subtask as deleted
func (s *TaskService) SoftDeleteSubtask(id int64) error {
	s.logger.Info("soft deleting subtask",
		zap.Int64("id", id),
	)

	if err := s.repo.SoftDeleteSubtask(id); err != nil {
		s.logger.Error("failed to soft delete subtask",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return err
	}

	s.logger.Info("subtask soft deleted successfully",
		zap.Int64("id", id),
	)

	return nil
}

// SoftDeleteAllSubtasks marks all subtasks of a task as deleted
func (s *TaskService) SoftDeleteAllSubtasks(taskID int64) error {
	s.logger.Info("soft deleting all subtasks",
		zap.Int64("task_id", taskID),
	)

	if err := s.repo.SoftDeleteAllSubtasks(taskID); err != nil {
		s.logger.Error("failed to soft delete all subtasks",
			zap.Error(err),
			zap.Int64("task_id", taskID),
		)
		return err
	}

	s.logger.Info("all subtasks soft deleted successfully",
		zap.Int64("task_id", taskID),
	)

	return nil
}

// RestoreSubtask restores a soft-deleted subtask
func (s *TaskService) RestoreSubtask(id int64) error {
	s.logger.Info("restoring subtask",
		zap.Int64("id", id),
	)

	if err := s.repo.RestoreSubtask(id); err != nil {
		s.logger.Error("failed to restore subtask",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return err
	}

	s.logger.Info("subtask restored successfully",
		zap.Int64("id", id),
	)

	return nil
}

// validateSubtaskName validates that a subtask name is not empty or whitespace-only
func (s *TaskService) validateSubtaskName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return fmt.Errorf("subtask name cannot be empty or whitespace-only")
	}
	return nil
}

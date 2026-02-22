package services

import (
	"fmt"
	"time"

	"src/backend/models"
	"src/backend/repository"

	"go.uber.org/zap"
)

// ReportService handles business logic for report operations
type ReportService struct {
	repo   *repository.ReportRepository
	logger *zap.Logger
}

// TaskChange represents detected changes in a task
type TaskChange struct {
	StatusChanged bool
	OldStatus     string
	ECDChanged    bool
	OldECD        *time.Time
}

// SubtaskChange represents detected changes in a subtask
type SubtaskChange struct {
	StatusChanged bool
	OldStatus     string
	ECDChanged    bool
	OldECD        *time.Time
}

// NewReportService creates a new ReportService
func NewReportService(repo *repository.ReportRepository, logger *zap.Logger) *ReportService {
	return &ReportService{
		repo:   repo,
		logger: logger,
	}
}

// CreateReportSection creates a new report section with validation
func (s *ReportService) CreateReportSection(section *models.ReportSection) error {
	s.logger.Info("creating report section",
		zap.String("name", section.Name),
		zap.Int64("project_id", section.ProjectID),
		zap.String("type", section.Type),
	)

	// Validate section name
	if err := s.validateSectionName(section.Name); err != nil {
		s.logger.Error("section name validation failed",
			zap.Error(err),
			zap.String("name", section.Name),
		)
		return err
	}

	// Validate section type
	if err := s.validateSectionType(section.Type); err != nil {
		s.logger.Error("section type validation failed",
			zap.Error(err),
			zap.String("type", section.Type),
		)
		return err
	}

	// Create section in repository
	if err := s.repo.CreateReportSection(section); err != nil {
		s.logger.Error("failed to create report section in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("report section created successfully",
		zap.Int64("id", section.ID),
		zap.String("name", section.Name),
	)

	return nil
}

// UpdateReportSection updates an existing report section with validation
func (s *ReportService) UpdateReportSection(section *models.ReportSection) error {
	s.logger.Info("updating report section",
		zap.Int64("id", section.ID),
		zap.String("name", section.Name),
	)

	// Validate section name
	if err := s.validateSectionName(section.Name); err != nil {
		s.logger.Error("section name validation failed",
			zap.Error(err),
			zap.String("name", section.Name),
		)
		return err
	}

	// Validate section type
	if err := s.validateSectionType(section.Type); err != nil {
		s.logger.Error("section type validation failed",
			zap.Error(err),
			zap.String("type", section.Type),
		)
		return err
	}

	// Update section in repository
	if err := s.repo.UpdateReportSection(section); err != nil {
		s.logger.Error("failed to update report section in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("report section updated successfully",
		zap.Int64("id", section.ID),
	)

	return nil
}

// GetReportSection retrieves a report section by ID
func (s *ReportService) GetReportSection(id int64) (*models.ReportSection, error) {
	s.logger.Debug("getting report section",
		zap.Int64("id", id),
	)

	section, err := s.repo.GetReportSectionByID(id)
	if err != nil {
		s.logger.Error("failed to get report section",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return nil, err
	}

	return section, nil
}

// ListReportSections retrieves all report sections for a project
func (s *ReportService) ListReportSections(projectID int64) ([]*models.ReportSection, error) {
	s.logger.Debug("listing report sections",
		zap.Int64("project_id", projectID),
	)

	sections, err := s.repo.ListReportSections(projectID)
	if err != nil {
		s.logger.Error("failed to list report sections",
			zap.Error(err),
			zap.Int64("project_id", projectID),
		)
		return nil, err
	}

	s.logger.Debug("listed report sections",
		zap.Int("count", len(sections)),
		zap.Int64("project_id", projectID),
	)

	return sections, nil
}

// ReorderSections reorders report sections by updating their order
func (s *ReportService) ReorderSections(projectID int64, sectionIDs []int64) error {
	s.logger.Info("reordering report sections",
		zap.Int64("project_id", projectID),
		zap.Int("section_count", len(sectionIDs)),
	)

	// Update order for each section based on its position in the array
	for i, sectionID := range sectionIDs {
		section, err := s.repo.GetReportSectionByID(sectionID)
		if err != nil {
			s.logger.Error("failed to get report section for reorder",
				zap.Error(err),
				zap.Int64("section_id", sectionID),
			)
			return fmt.Errorf("failed to get section %d: %w", sectionID, err)
		}

		// Verify section belongs to the project
		if section.ProjectID != projectID {
			s.logger.Error("section does not belong to project",
				zap.Int64("section_id", sectionID),
				zap.Int64("section_project_id", section.ProjectID),
				zap.Int64("target_project_id", projectID),
			)
			return fmt.Errorf("section %d does not belong to project %d", sectionID, projectID)
		}

		// Update order (0-indexed)
		section.Order = i

		if err := s.repo.UpdateReportSection(section); err != nil {
			s.logger.Error("failed to update section order",
				zap.Error(err),
				zap.Int64("section_id", sectionID),
				zap.Int("order", i),
			)
			return fmt.Errorf("failed to update section %d order: %w", sectionID, err)
		}
	}

	s.logger.Info("report sections reordered successfully",
		zap.Int64("project_id", projectID),
		zap.Int("section_count", len(sectionIDs)),
	)

	return nil
}

// validateSectionName validates that a section name is not empty
func (s *ReportService) validateSectionName(name string) error {
	if name == "" {
		return fmt.Errorf("section name cannot be empty")
	}
	return nil
}

// validateSectionType validates that a section type is either "prose" or "status"
func (s *ReportService) validateSectionType(sectionType string) error {
	if sectionType != "prose" && sectionType != "status" {
		return fmt.Errorf("section type must be 'prose' or 'status', got: %s", sectionType)
	}
	return nil
}

// CreateStatusDefinition creates a new status definition with validation
func (s *ReportService) CreateStatusDefinition(status *models.StatusDefinition) error {
	s.logger.Info("creating status definition",
		zap.String("name", status.Name),
		zap.Int64("project_id", status.ProjectID),
		zap.String("style", status.Style),
	)

	// Validate status name
	if err := s.validateStatusName(status.Name); err != nil {
		s.logger.Error("status name validation failed",
			zap.Error(err),
			zap.String("name", status.Name),
		)
		return err
	}

	// Validate status style
	if err := s.validateStatusStyle(status.Style); err != nil {
		s.logger.Error("status style validation failed",
			zap.Error(err),
			zap.String("style", status.Style),
		)
		return err
	}

	// Create status definition in repository
	if err := s.repo.CreateStatusDefinition(status); err != nil {
		s.logger.Error("failed to create status definition in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("status definition created successfully",
		zap.Int64("id", status.ID),
		zap.String("name", status.Name),
	)

	return nil
}

// UpdateStatusDefinition updates an existing status definition with validation
func (s *ReportService) UpdateStatusDefinition(status *models.StatusDefinition) error {
	s.logger.Info("updating status definition",
		zap.Int64("id", status.ID),
		zap.String("name", status.Name),
	)

	// Validate status name
	if err := s.validateStatusName(status.Name); err != nil {
		s.logger.Error("status name validation failed",
			zap.Error(err),
			zap.String("name", status.Name),
		)
		return err
	}

	// Validate status style
	if err := s.validateStatusStyle(status.Style); err != nil {
		s.logger.Error("status style validation failed",
			zap.Error(err),
			zap.String("style", status.Style),
		)
		return err
	}

	// Update status definition in repository
	if err := s.repo.UpdateStatusDefinition(status); err != nil {
		s.logger.Error("failed to update status definition in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("status definition updated successfully",
		zap.Int64("id", status.ID),
	)

	return nil
}

// ListStatusDefinitions retrieves all status definitions for a project
func (s *ReportService) ListStatusDefinitions(projectID int64) ([]*models.StatusDefinition, error) {
	s.logger.Debug("listing status definitions",
		zap.Int64("project_id", projectID),
	)

	statuses, err := s.repo.ListStatusDefinitions(projectID)
	if err != nil {
		s.logger.Error("failed to list status definitions",
			zap.Error(err),
			zap.Int64("project_id", projectID),
		)
		return nil, err
	}

	s.logger.Debug("listed status definitions",
		zap.Int("count", len(statuses)),
		zap.Int64("project_id", projectID),
	)

	return statuses, nil
}

// validateStatusName validates that a status name is not empty
func (s *ReportService) validateStatusName(name string) error {
	if name == "" {
		return fmt.Errorf("status name cannot be empty")
	}
	return nil
}

// validateStatusStyle validates that a status style is one of the valid styles
func (s *ReportService) validateStatusStyle(style string) error {
	validStyles := map[string]bool{
		"red":     true,
		"green":   true,
		"yellow":  true,
		"gray":    true,
		"paused":  true,
		"pending": true,
	}

	if !validStyles[style] {
		return fmt.Errorf("status style must be one of: red, green, yellow, gray, paused, pending; got: %s", style)
	}
	return nil
}

// detectTaskChanges compares current task state with last Task_History entry
// Returns TaskChange indicating what changed (status, ECD) and the old values
// Only detects status and expected_completion_date changes (NOT name, URL, or notes)
func (s *ReportService) detectTaskChanges(task *models.Task) (*TaskChange, error) {
	s.logger.Debug("detecting task changes",
		zap.Int64("task_id", task.ID),
		zap.String("task_name", task.Name),
	)

	// Get the most recent task history entry
	lastHistory, err := s.repo.GetLastTaskHistory(task.ID, nil)
	if err != nil {
		s.logger.Error("failed to get last task history",
			zap.Error(err),
			zap.Int64("task_id", task.ID),
		)
		return nil, fmt.Errorf("failed to get last task history: %w", err)
	}

	// If no history exists, no changes to detect
	if lastHistory == nil {
		s.logger.Debug("no history found for task, no changes detected",
			zap.Int64("task_id", task.ID),
		)
		return &TaskChange{
			StatusChanged: false,
			ECDChanged:    false,
		}, nil
	}

	// Compare status
	statusChanged := task.Status != lastHistory.Status
	oldStatus := lastHistory.Status

	// Compare expected completion date
	ecdChanged := !equalDates(task.ExpectedCompletionDate, lastHistory.ExpectedCompletionDate)
	oldECD := lastHistory.ExpectedCompletionDate

	s.logger.Debug("task change detection complete",
		zap.Int64("task_id", task.ID),
		zap.Bool("status_changed", statusChanged),
		zap.Bool("ecd_changed", ecdChanged),
	)

	return &TaskChange{
		StatusChanged: statusChanged,
		OldStatus:     oldStatus,
		ECDChanged:    ecdChanged,
		OldECD:        oldECD,
	}, nil
}

// detectSubtaskChanges compares current subtask state with last Task_History entry
// Returns SubtaskChange indicating what changed (status, ECD) and the old values
// Only detects status and expected_completion_date changes (NOT name, URL, or notes)
func (s *ReportService) detectSubtaskChanges(subtask *models.Subtask) (*SubtaskChange, error) {
	s.logger.Debug("detecting subtask changes",
		zap.Int64("subtask_id", subtask.ID),
		zap.Int64("task_id", subtask.TaskID),
		zap.String("subtask_name", subtask.Name),
	)

	// Get the most recent subtask history entry
	lastHistory, err := s.repo.GetLastTaskHistory(subtask.TaskID, &subtask.ID)
	if err != nil {
		s.logger.Error("failed to get last subtask history",
			zap.Error(err),
			zap.Int64("subtask_id", subtask.ID),
			zap.Int64("task_id", subtask.TaskID),
		)
		return nil, fmt.Errorf("failed to get last subtask history: %w", err)
	}

	// If no history exists, no changes to detect
	if lastHistory == nil {
		s.logger.Debug("no history found for subtask, no changes detected",
			zap.Int64("subtask_id", subtask.ID),
		)
		return &SubtaskChange{
			StatusChanged: false,
			ECDChanged:    false,
		}, nil
	}

	// Compare status
	statusChanged := subtask.Status != lastHistory.Status
	oldStatus := lastHistory.Status

	// Compare expected completion date
	ecdChanged := !equalDates(subtask.ExpectedCompletionDate, lastHistory.ExpectedCompletionDate)
	oldECD := lastHistory.ExpectedCompletionDate

	s.logger.Debug("subtask change detection complete",
		zap.Int64("subtask_id", subtask.ID),
		zap.Bool("status_changed", statusChanged),
		zap.Bool("ecd_changed", ecdChanged),
	)

	return &SubtaskChange{
		StatusChanged: statusChanged,
		OldStatus:     oldStatus,
		ECDChanged:    ecdChanged,
		OldECD:        oldECD,
	}, nil
}

// equalDates compares two date pointers for equality
// Returns true if both are nil or both point to the same date (ignoring time)
func equalDates(date1, date2 *time.Time) bool {
	// Both nil
	if date1 == nil && date2 == nil {
		return true
	}

	// One nil, one not
	if date1 == nil || date2 == nil {
		return false
	}

	// Compare dates (year, month, day only)
	y1, m1, d1 := date1.Date()
	y2, m2, d2 := date2.Date()
	return y1 == y2 && m1 == m2 && d1 == d2
}

// TaskWithChanges represents a task with its subtasks and detected changes
type TaskWithChanges struct {
	Task           *models.Task
	Subtasks       []*models.Subtask
	TaskChange     *TaskChange
	SubtaskChanges map[int64]*SubtaskChange // keyed by subtask ID
	StatusStyleMap map[string]string        // maps status name to CSS class
}

// renderTasksAsMarkdown renders a list of tasks with their subtasks as markdown
// Implements requirements 7.7, 7.8, 7.9:
// - Renders task name, URL, status badges, ECD
// - Renders status and ECD change indicators
// - Renders subtasks with proper indentation
func (s *ReportService) renderTasksAsMarkdown(tasks []*TaskWithChanges) string {
	var result string

	for _, taskWithChanges := range tasks {
		task := taskWithChanges.Task
		taskChange := taskWithChanges.TaskChange

		// Render task name with optional URL
		if task.URL != "" {
			result += fmt.Sprintf("- [%s](%s)", task.Name, task.URL)
		} else {
			result += fmt.Sprintf("- %s", task.Name)
		}

		// Render status with change indicator
		if taskChange.StatusChanged {
			// Status changed: show old → new
			oldStyle := taskWithChanges.StatusStyleMap[taskChange.OldStatus]
			newStyle := taskWithChanges.StatusStyleMap[task.Status]
			result += fmt.Sprintf(" <span class=\"%s\">%s</span> → <span class=\"%s\">%s</span>",
				oldStyle, taskChange.OldStatus, newStyle, task.Status)
		} else {
			// Status unchanged: show current status
			style := taskWithChanges.StatusStyleMap[task.Status]
			result += fmt.Sprintf(" <span class=\"%s\">%s</span>", style, task.Status)
		}

		// Render ECD with change indicator
		if task.ExpectedCompletionDate != nil {
			if taskChange.ECDChanged && taskChange.OldECD != nil {
				// ECD changed: show ~~old~~ new
				result += fmt.Sprintf(" ~~%s~~ %s",
					taskChange.OldECD.Format("2006-01-02"),
					task.ExpectedCompletionDate.Format("2006-01-02"))
			} else {
				// ECD unchanged or new: show current ECD
				result += fmt.Sprintf(" %s", task.ExpectedCompletionDate.Format("2006-01-02"))
			}
		}

		result += "\n"

		// Render notes if present (indented with 2 spaces)
		if task.Notes != "" {
			result += fmt.Sprintf("  %s\n", task.Notes)
		}

		// Render subtasks
		for _, subtask := range taskWithChanges.Subtasks {
			subtaskChange := taskWithChanges.SubtaskChanges[subtask.ID]

			// Render subtask name with optional URL (indented with 2 spaces)
			if subtask.URL != "" {
				result += fmt.Sprintf("  - [%s](%s)", subtask.Name, subtask.URL)
			} else {
				result += fmt.Sprintf("  - %s", subtask.Name)
			}

			// Render subtask status with change indicator
			if subtaskChange != nil && subtaskChange.StatusChanged {
				// Status changed: show old → new
				oldStyle := taskWithChanges.StatusStyleMap[subtaskChange.OldStatus]
				newStyle := taskWithChanges.StatusStyleMap[subtask.Status]
				result += fmt.Sprintf(" <span class=\"%s\">%s</span> → <span class=\"%s\">%s</span>",
					oldStyle, subtaskChange.OldStatus, newStyle, subtask.Status)
			} else {
				// Status unchanged: show current status
				style := taskWithChanges.StatusStyleMap[subtask.Status]
				result += fmt.Sprintf(" <span class=\"%s\">%s</span>", style, subtask.Status)
			}

			// Render subtask ECD with change indicator
			if subtask.ExpectedCompletionDate != nil {
				if subtaskChange != nil && subtaskChange.ECDChanged && subtaskChange.OldECD != nil {
					// ECD changed: show ~~old~~ new
					result += fmt.Sprintf(" ~~%s~~ %s",
						subtaskChange.OldECD.Format("2006-01-02"),
						subtask.ExpectedCompletionDate.Format("2006-01-02"))
				} else {
					// ECD unchanged or new: show current ECD
					result += fmt.Sprintf(" %s", subtask.ExpectedCompletionDate.Format("2006-01-02"))
				}
			}

			result += "\n"

			// Render subtask notes if present (indented with 4 spaces)
			if subtask.Notes != "" {
				result += fmt.Sprintf("    %s\n", subtask.Notes)
			}
		}

		// Add blank line after each task
		result += "\n"
	}

	return result
}

// getStatusStyle returns the CSS class for a given status name
// Maps status name to style class (e.g., "in progress" -> "status-yellow")
func (s *ReportService) getStatusStyle(projectID int64, statusName string) (string, error) {
	// Get all status definitions for the project
	statuses, err := s.repo.ListStatusDefinitions(projectID)
	if err != nil {
		return "", fmt.Errorf("failed to get status definitions: %w", err)
	}

	// Find the status definition matching the name
	for _, status := range statuses {
		if status.Name == statusName {
			return fmt.Sprintf("status-%s", status.Style), nil
		}
	}

	// Default to gray if status not found
	s.logger.Warn("status not found in definitions, using default gray style",
		zap.String("status_name", statusName),
		zap.Int64("project_id", projectID),
	)
	return "status-gray", nil
}

// renderStatusSection generates markdown content for a status-type report section
// Implements requirement 7.6: Filter tasks by section, apply change detection, render as markdown
func (s *ReportService) renderStatusSection(section *models.ReportSection, projectID int64, taskRepo *repository.TaskRepository) (string, error) {
	s.logger.Debug("rendering status section",
		zap.Int64("section_id", section.ID),
		zap.String("section_name", section.Name),
		zap.Int64("project_id", projectID),
	)

	// 1. Get all tasks for this section (not deleted, not archived)
	tasks, err := taskRepo.ListTasksBySection(section.ID)
	if err != nil {
		s.logger.Error("failed to list tasks by section",
			zap.Error(err),
			zap.Int64("section_id", section.ID),
		)
		return "", fmt.Errorf("failed to list tasks by section: %w", err)
	}

	// 2. Build status style map for this project
	statusStyleMap, err := s.buildStatusStyleMap(projectID)
	if err != nil {
		s.logger.Error("failed to build status style map",
			zap.Error(err),
			zap.Int64("project_id", projectID),
		)
		return "", fmt.Errorf("failed to build status style map: %w", err)
	}

	// 3. For each task, get subtasks and detect changes
	tasksWithChanges := make([]*TaskWithChanges, 0, len(tasks))
	for _, task := range tasks {
		// Get subtasks for this task
		subtasks, err := taskRepo.ListSubtasksByTask(task.ID)
		if err != nil {
			s.logger.Error("failed to list subtasks",
				zap.Error(err),
				zap.Int64("task_id", task.ID),
			)
			return "", fmt.Errorf("failed to list subtasks for task %d: %w", task.ID, err)
		}

		// Detect task changes
		taskChange, err := s.detectTaskChanges(task)
		if err != nil {
			s.logger.Error("failed to detect task changes",
				zap.Error(err),
				zap.Int64("task_id", task.ID),
			)
			return "", fmt.Errorf("failed to detect task changes: %w", err)
		}

		// Detect subtask changes
		subtaskChanges := make(map[int64]*SubtaskChange)
		for _, subtask := range subtasks {
			subtaskChange, err := s.detectSubtaskChanges(subtask)
			if err != nil {
				s.logger.Error("failed to detect subtask changes",
					zap.Error(err),
					zap.Int64("subtask_id", subtask.ID),
				)
				return "", fmt.Errorf("failed to detect subtask changes: %w", err)
			}
			subtaskChanges[subtask.ID] = subtaskChange
		}

		tasksWithChanges = append(tasksWithChanges, &TaskWithChanges{
			Task:           task,
			Subtasks:       subtasks,
			TaskChange:     taskChange,
			SubtaskChanges: subtaskChanges,
			StatusStyleMap: statusStyleMap,
		})
	}

	// 4. Render markdown for this section
	markdown := s.renderTasksAsMarkdown(tasksWithChanges)

	s.logger.Debug("status section rendered",
		zap.Int64("section_id", section.ID),
		zap.Int("task_count", len(tasks)),
	)

	return markdown, nil
}

// buildStatusStyleMap creates a map from status name to CSS class for a project
func (s *ReportService) buildStatusStyleMap(projectID int64) (map[string]string, error) {
	statuses, err := s.repo.ListStatusDefinitions(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get status definitions: %w", err)
	}

	styleMap := make(map[string]string)
	for _, status := range statuses {
		styleMap[status.Name] = fmt.Sprintf("status-%s", status.Style)
	}

	return styleMap, nil
}

// GeneratedReport represents a complete generated report with all sections
type GeneratedReport struct {
	Title      string
	Recipients Recipients
	Sections   []RenderedSection
	CSS        string
}

// Recipients represents the email recipients for a report
type Recipients struct {
	To  string
	CC  string
	BCC string
}

// RenderedSection represents a single rendered section in a report
type RenderedSection struct {
	Name    string
	Type    string
	Content string
}

// GenerateReport generates a complete report for a project at a given date
// Implements requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.12, 8.1:
// - Creates markdown content with embedded HTML styling
// - Includes recipients block, title, CSS styles
// - Includes all enabled sections in configured order
// - Does NOT create Task_History or Report_Snapshot (preview only)
func (s *ReportService) GenerateReport(projectID int64, date time.Time, projectService *ProjectService, taskRepo *repository.TaskRepository) (*GeneratedReport, error) {
	s.logger.Info("generating report",
		zap.Int64("project_id", projectID),
		zap.Time("date", date),
	)

	// 1. Load project configuration
	project, err := projectService.GetProject(projectID)
	if err != nil {
		s.logger.Error("failed to get project",
			zap.Error(err),
			zap.Int64("project_id", projectID),
		)
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	// 2. Build recipients block
	recipients := Recipients{
		To:  project.RecipientsTo,
		CC:  project.RecipientsCC,
		BCC: project.RecipientsBCC,
	}

	s.logger.Debug("built recipients block",
		zap.String("to", recipients.To),
		zap.String("cc", recipients.CC),
		zap.String("bcc", recipients.BCC),
	)

	// 3. Render title using template
	title := projectService.RenderReportTitle(project, date)

	s.logger.Debug("rendered report title",
		zap.String("title", title),
	)

	// 4. Load enabled report sections in order
	allSections, err := s.repo.ListReportSections(projectID)
	if err != nil {
		s.logger.Error("failed to list report sections",
			zap.Error(err),
			zap.Int64("project_id", projectID),
		)
		return nil, fmt.Errorf("failed to list report sections: %w", err)
	}

	// Filter to only enabled sections
	enabledSections := make([]*models.ReportSection, 0)
	for _, section := range allSections {
		if section.IsEnabled {
			enabledSections = append(enabledSections, section)
		}
	}

	s.logger.Debug("filtered enabled sections",
		zap.Int("total_sections", len(allSections)),
		zap.Int("enabled_sections", len(enabledSections)),
	)

	// 5. Render each section
	renderedSections := make([]RenderedSection, 0, len(enabledSections))
	for _, section := range enabledSections {
		var content string

		if section.Type == "prose" {
			// Prose section: use stored content
			content = section.Content
			s.logger.Debug("rendered prose section",
				zap.String("section_name", section.Name),
				zap.Int("content_length", len(content)),
			)
		} else {
			// Status section: generate from tasks
			var err error
			content, err = s.renderStatusSection(section, projectID, taskRepo)
			if err != nil {
				s.logger.Error("failed to render status section",
					zap.Error(err),
					zap.String("section_name", section.Name),
					zap.Int64("section_id", section.ID),
				)
				return nil, fmt.Errorf("failed to render status section %s: %w", section.Name, err)
			}
			s.logger.Debug("rendered status section",
				zap.String("section_name", section.Name),
				zap.Int("content_length", len(content)),
			)
		}

		renderedSections = append(renderedSections, RenderedSection{
			Name:    section.Name,
			Type:    section.Type,
			Content: content,
		})
	}

	// 6. Load CSS styles for status badges
	css := getStatusBadgeCSS()

	s.logger.Info("report generated successfully",
		zap.Int64("project_id", projectID),
		zap.String("title", title),
		zap.Int("section_count", len(renderedSections)),
	)

	return &GeneratedReport{
		Title:      title,
		Recipients: recipients,
		Sections:   renderedSections,
		CSS:        css,
	}, nil
}

// getStatusBadgeCSS returns the CSS styles for status badges
// Implements requirement 7.4: Include CSS styles for Status_Badges in the report
func getStatusBadgeCSS() string {
	return `<style>
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
</style>`
}

// FinalizeReport creates a report snapshot and captures task history
// Implements requirements 4.6, 4.7, 4.8, 8.10, 8.11, 8.12, 8.13:
// - Creates Report_Snapshot with markdown content and timestamp
// - Captures Task_History for all non-deleted, non-archived tasks and subtasks
// - Links all records to project and snapshot
func (s *ReportService) FinalizeReport(projectID int64, markdownContent string, taskRepo *repository.TaskRepository) (*models.ReportSnapshot, error) {
	s.logger.Info("finalizing report",
		zap.Int64("project_id", projectID),
		zap.Int("content_length", len(markdownContent)),
	)

	// 1. Create report snapshot
	now := time.Now()
	snapshot := &models.ReportSnapshot{
		ProjectID:       projectID,
		MarkdownContent: markdownContent,
		FinalizedAt:     now,
	}

	if err := s.repo.CreateReportSnapshot(snapshot); err != nil {
		s.logger.Error("failed to create report snapshot",
			zap.Error(err),
			zap.Int64("project_id", projectID),
		)
		return nil, fmt.Errorf("failed to create report snapshot: %w", err)
	}

	s.logger.Info("report snapshot created",
		zap.Int64("snapshot_id", snapshot.ID),
		zap.Int64("project_id", projectID),
	)

	// 2. Capture task history for all tasks in project
	tasks, err := taskRepo.ListTasksByProject(projectID)
	if err != nil {
		s.logger.Error("failed to list tasks for project",
			zap.Error(err),
			zap.Int64("project_id", projectID),
		)
		return nil, fmt.Errorf("failed to list tasks for project: %w", err)
	}

	s.logger.Debug("capturing task history",
		zap.Int("task_count", len(tasks)),
		zap.Int64("snapshot_id", snapshot.ID),
	)

	taskHistoryCount := 0
	subtaskHistoryCount := 0

	for _, task := range tasks {
		// Create task history entry
		history := &models.TaskHistory{
			ReportSnapshotID:       snapshot.ID,
			TaskID:                 task.ID,
			SubtaskID:              nil,
			Name:                   task.Name,
			Status:                 task.Status,
			ExpectedCompletionDate: task.ExpectedCompletionDate,
			URL:                    task.URL,
			Notes:                  task.Notes,
			CreatedAt:              now,
		}

		if err := s.repo.CreateTaskHistory(history); err != nil {
			s.logger.Error("failed to create task history",
				zap.Error(err),
				zap.Int64("task_id", task.ID),
				zap.Int64("snapshot_id", snapshot.ID),
			)
			return nil, fmt.Errorf("failed to create task history for task %d: %w", task.ID, err)
		}

		taskHistoryCount++

		// Capture subtask history
		subtasks, err := taskRepo.ListSubtasksByTask(task.ID)
		if err != nil {
			s.logger.Error("failed to list subtasks",
				zap.Error(err),
				zap.Int64("task_id", task.ID),
			)
			return nil, fmt.Errorf("failed to list subtasks for task %d: %w", task.ID, err)
		}

		for _, subtask := range subtasks {
			subHistory := &models.TaskHistory{
				ReportSnapshotID:       snapshot.ID,
				TaskID:                 task.ID,
				SubtaskID:              &subtask.ID,
				Name:                   subtask.Name,
				Status:                 subtask.Status,
				ExpectedCompletionDate: subtask.ExpectedCompletionDate,
				URL:                    subtask.URL,
				Notes:                  subtask.Notes,
				CreatedAt:              now,
			}

			if err := s.repo.CreateTaskHistory(subHistory); err != nil {
				s.logger.Error("failed to create subtask history",
					zap.Error(err),
					zap.Int64("subtask_id", subtask.ID),
					zap.Int64("task_id", task.ID),
					zap.Int64("snapshot_id", snapshot.ID),
				)
				return nil, fmt.Errorf("failed to create subtask history for subtask %d: %w", subtask.ID, err)
			}

			subtaskHistoryCount++
		}
	}

	s.logger.Info("report finalized successfully",
		zap.Int64("snapshot_id", snapshot.ID),
		zap.Int64("project_id", projectID),
		zap.Int("task_history_count", taskHistoryCount),
		zap.Int("subtask_history_count", subtaskHistoryCount),
		zap.Time("finalized_at", snapshot.FinalizedAt),
	)

	return snapshot, nil
}

// GetReportSnapshot retrieves a report snapshot by ID
// Implements requirement 8.14: Allow users to view historical Report_Snapshots
func (s *ReportService) GetReportSnapshot(id int64) (*models.ReportSnapshot, error) {
	s.logger.Debug("getting report snapshot",
		zap.Int64("id", id),
	)

	snapshot, err := s.repo.GetReportSnapshotByID(id)
	if err != nil {
		s.logger.Error("failed to get report snapshot",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return nil, err
	}

	return snapshot, nil
}

// ListReportSnapshots retrieves all report snapshots for a project
// Implements requirement 8.14: Allow users to view historical Report_Snapshots
func (s *ReportService) ListReportSnapshots(projectID int64) ([]*models.ReportSnapshot, error) {
	s.logger.Debug("listing report snapshots",
		zap.Int64("project_id", projectID),
	)

	snapshots, err := s.repo.ListReportSnapshots(projectID)
	if err != nil {
		s.logger.Error("failed to list report snapshots",
			zap.Error(err),
			zap.Int64("project_id", projectID),
		)
		return nil, err
	}

	s.logger.Debug("listed report snapshots",
		zap.Int("count", len(snapshots)),
		zap.Int64("project_id", projectID),
	)

	return snapshots, nil
}

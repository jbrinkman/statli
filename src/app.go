package main

import (
	"context"

	"src/backend"
	"src/backend/models"
	"src/backend/repository"
	"src/backend/services"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.uber.org/zap"
)

// App struct
type App struct {
	ctx            context.Context
	db             *repository.DB
	logger         *zap.Logger
	projectService *services.ProjectService
	taskService    *services.TaskService
	reportService  *services.ReportService
	exportService  *services.ExportService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize logger
	logger, err := backend.InitLogger()
	if err != nil {
		panic("failed to initialize logger: " + err.Error())
	}
	a.logger = logger

	logger.Info("application starting")

	// Initialize database
	db, err := repository.InitDB(logger)
	if err != nil {
		logger.Fatal("failed to initialize database", zap.Error(err))
	}
	a.db = db

	// Initialize repositories
	projectRepo := repository.NewProjectRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	reportRepo := repository.NewReportRepository(db)

	// Initialize template service
	templateService := services.NewTemplateService(logger)

	// Initialize services with dependencies
	a.projectService = services.NewProjectService(projectRepo, templateService, logger)
	a.taskService = services.NewTaskService(taskRepo, logger)
	a.reportService = services.NewReportService(reportRepo, logger)
	a.exportService = services.NewExportService(templateService, logger)

	logger.Info("application startup complete",
		zap.String("services", "ProjectService, TaskService, ReportService, ExportService"),
	)
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	if a.logger != nil {
		a.logger.Info("application shutting down")
	}

	if a.db != nil {
		if err := a.db.Close(); err != nil {
			a.logger.Error("failed to close database", zap.Error(err))
		}
	}

	if a.logger != nil {
		_ = a.logger.Sync()
	}
}

// GetProjectService returns the ProjectService for frontend binding
func (a *App) GetProjectService() *services.ProjectService {
	return a.projectService
}

// GetTaskService returns the TaskService for frontend binding
func (a *App) GetTaskService() *services.TaskService {
	return a.taskService
}

// GetReportService returns the ReportService for frontend binding
func (a *App) GetReportService() *services.ReportService {
	return a.reportService
}

// GetExportService returns the ExportService for frontend binding
func (a *App) GetExportService() *services.ExportService {
	return a.exportService
}

// ProjectService methods exposed to frontend

// CreateProject creates a new project
func (a *App) CreateProject(project *models.Project) error {
	return a.projectService.CreateProject(project)
}

// UpdateProject updates an existing project
func (a *App) UpdateProject(project *models.Project) error {
	return a.projectService.UpdateProject(project)
}

// GetProject retrieves a project by ID
func (a *App) GetProject(id int64) (*models.Project, error) {
	return a.projectService.GetProject(id)
}

// ListActiveProjects retrieves all active projects
func (a *App) ListActiveProjects() ([]*models.Project, error) {
	return a.projectService.ListActiveProjects()
}

// ListArchivedProjects retrieves all archived projects
func (a *App) ListArchivedProjects() ([]*models.Project, error) {
	return a.projectService.ListArchivedProjects()
}

// ArchiveProject marks a project as archived
func (a *App) ArchiveProject(id int64) error {
	return a.projectService.ArchiveProject(id)
}

// TaskService methods exposed to frontend

// CreateTask creates a new task
func (a *App) CreateTask(task *models.Task) error {
	return a.taskService.CreateTask(task)
}

// UpdateTask updates an existing task
func (a *App) UpdateTask(task *models.Task) error {
	return a.taskService.UpdateTask(task)
}

// GetTask retrieves a task by ID
func (a *App) GetTask(id int64) (*models.Task, error) {
	return a.taskService.GetTask(id)
}

// ListTasksBySection retrieves all tasks for a section
func (a *App) ListTasksBySection(sectionID int64) ([]*models.Task, error) {
	return a.taskService.ListTasksBySection(sectionID)
}

// MoveTaskToSection moves a task to a different section
func (a *App) MoveTaskToSection(taskID, sectionID int64) error {
	return a.taskService.MoveTaskToSection(taskID, sectionID)
}

// ReorderTasks reorders tasks within a section
func (a *App) ReorderTasks(sectionID int64, taskIDs []int64) error {
	return a.taskService.ReorderTasks(sectionID, taskIDs)
}

// SoftDeleteTask marks a task as deleted
func (a *App) SoftDeleteTask(id int64) error {
	return a.taskService.SoftDeleteTask(id)
}

// RestoreTask restores a soft-deleted task
func (a *App) RestoreTask(id int64) error {
	return a.taskService.RestoreTask(id)
}

// ArchiveTask marks a task as archived
func (a *App) ArchiveTask(id int64) error {
	return a.taskService.ArchiveTask(id)
}

// CreateSubtask creates a new subtask
func (a *App) CreateSubtask(subtask *models.Subtask) error {
	return a.taskService.CreateSubtask(subtask)
}

// UpdateSubtask updates an existing subtask
func (a *App) UpdateSubtask(subtask *models.Subtask) error {
	return a.taskService.UpdateSubtask(subtask)
}

// GetSubtask retrieves a subtask by ID
func (a *App) GetSubtask(id int64) (*models.Subtask, error) {
	return a.taskService.GetSubtask(id)
}

// ListSubtasksByTask retrieves all subtasks for a task
func (a *App) ListSubtasksByTask(taskID int64) ([]*models.Subtask, error) {
	return a.taskService.ListSubtasksByTask(taskID)
}

// SoftDeleteSubtask marks a subtask as deleted
func (a *App) SoftDeleteSubtask(id int64) error {
	return a.taskService.SoftDeleteSubtask(id)
}

// SoftDeleteAllSubtasks marks all subtasks of a task as deleted
func (a *App) SoftDeleteAllSubtasks(taskID int64) error {
	return a.taskService.SoftDeleteAllSubtasks(taskID)
}

// RestoreSubtask restores a soft-deleted subtask
func (a *App) RestoreSubtask(id int64) error {
	return a.taskService.RestoreSubtask(id)
}

// ReportService methods exposed to frontend

// CreateReportSection creates a new report section
func (a *App) CreateReportSection(section *models.ReportSection) error {
	return a.reportService.CreateReportSection(section)
}

// UpdateReportSection updates an existing report section
func (a *App) UpdateReportSection(section *models.ReportSection) error {
	return a.reportService.UpdateReportSection(section)
}

// GetReportSection retrieves a report section by ID
func (a *App) GetReportSection(id int64) (*models.ReportSection, error) {
	return a.reportService.GetReportSection(id)
}

// ListReportSections retrieves all report sections for a project
func (a *App) ListReportSections(projectID int64) ([]*models.ReportSection, error) {
	return a.reportService.ListReportSections(projectID)
}

// ReorderSections reorders report sections within a project
func (a *App) ReorderSections(projectID int64, sectionIDs []int64) error {
	return a.reportService.ReorderSections(projectID, sectionIDs)
}

// CreateStatusDefinition creates a new status definition
func (a *App) CreateStatusDefinition(status *models.StatusDefinition) error {
	return a.reportService.CreateStatusDefinition(status)
}

// UpdateStatusDefinition updates an existing status definition
func (a *App) UpdateStatusDefinition(status *models.StatusDefinition) error {
	return a.reportService.UpdateStatusDefinition(status)
}

// ListStatusDefinitions retrieves all status definitions for a project
func (a *App) ListStatusDefinitions(projectID int64) ([]*models.StatusDefinition, error) {
	return a.reportService.ListStatusDefinitions(projectID)
}

// GenerateReport generates a report for a project at a given date
func (a *App) GenerateReport(projectID int64, dateStr string) (*services.GeneratedReport, error) {
	// Parse the date string (expected format: YYYY-MM-DD)
	date, err := backend.ParseDate(dateStr)
	if err != nil {
		a.logger.Error("failed to parse date for report generation",
			zap.Error(err),
			zap.String("date_string", dateStr),
		)
		return nil, err
	}

	// Get task repository for report generation
	taskRepo := repository.NewTaskRepository(a.db)

	return a.reportService.GenerateReport(projectID, date, a.projectService, taskRepo)
}

// FinalizeReport finalizes a report and captures task history
func (a *App) FinalizeReport(projectID int64, markdownContent string) (*models.ReportSnapshot, error) {
	// Get task repository for finalization
	taskRepo := repository.NewTaskRepository(a.db)

	return a.reportService.FinalizeReport(projectID, markdownContent, taskRepo)
}

// GetReportSnapshot retrieves a report snapshot by ID
func (a *App) GetReportSnapshot(id int64) (*models.ReportSnapshot, error) {
	return a.reportService.GetReportSnapshot(id)
}

// ListReportSnapshots retrieves all report snapshots for a project
func (a *App) ListReportSnapshots(projectID int64) ([]*models.ReportSnapshot, error) {
	return a.reportService.ListReportSnapshots(projectID)
}

// ExportService methods exposed to frontend

// ExportToFile exports markdown content to a file
func (a *App) ExportToFile(content string, filePath string) error {
	return a.exportService.ExportToFile(content, filePath)
}

// GetSuggestedFilepath generates a suggested filepath for exporting a report
func (a *App) GetSuggestedFilepath(projectID int64, dateStr string) (string, error) {
	// Get the project
	project, err := a.projectService.GetProject(projectID)
	if err != nil {
		return "", err
	}

	// Parse the date string (expected format: YYYY-MM-DD)
	date, err := backend.ParseDate(dateStr)
	if err != nil {
		a.logger.Error("failed to parse date for suggested filepath",
			zap.Error(err),
			zap.String("date_string", dateStr),
		)
		return "", err
	}

	return a.exportService.GetSuggestedFilepath(project, date), nil
}

// CopyToClipboard copies content to the system clipboard
func (a *App) CopyToClipboard(content string) error {
	return a.exportService.CopyToClipboard(content)
}

// SelectDirectory opens a directory selection dialog and returns the selected path
func (a *App) SelectDirectory() (string, error) {
	selection, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Report Directory",
	})
	if err != nil {
		a.logger.Error("failed to open directory dialog", zap.Error(err))
		return "", err
	}
	return selection, nil
}

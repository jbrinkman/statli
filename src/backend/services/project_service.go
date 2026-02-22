package services

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"src/backend/models"
	"src/backend/repository"

	"go.uber.org/zap"
)

// ProjectService handles business logic for project operations
type ProjectService struct {
	repo            *repository.ProjectRepository
	templateService *TemplateService
	logger          *zap.Logger
}

// NewProjectService creates a new ProjectService
func NewProjectService(repo *repository.ProjectRepository, templateService *TemplateService, logger *zap.Logger) *ProjectService {
	return &ProjectService{
		repo:            repo,
		templateService: templateService,
		logger:          logger,
	}
}

// CreateProject creates a new project with validation
func (s *ProjectService) CreateProject(project *models.Project) error {
	s.logger.Info("creating project",
		zap.String("name", project.Name),
	)

	// Validate project name
	if err := s.validateProjectName(project.Name); err != nil {
		s.logger.Error("project name validation failed",
			zap.Error(err),
			zap.String("name", project.Name),
		)
		return err
	}

	// Validate filename format
	if err := s.templateService.ValidateFilenameFormat(project.FilenameFormat); err != nil {
		s.logger.Error("filename format validation failed",
			zap.Error(err),
			zap.String("format", project.FilenameFormat),
		)
		return fmt.Errorf("invalid filename format: %w", err)
	}

	// Create project in repository
	if err := s.repo.Create(project); err != nil {
		s.logger.Error("failed to create project in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("project created successfully",
		zap.Int64("id", project.ID),
		zap.String("name", project.Name),
	)

	return nil
}

// UpdateProject updates an existing project with validation
func (s *ProjectService) UpdateProject(project *models.Project) error {
	s.logger.Info("updating project",
		zap.Int64("id", project.ID),
		zap.String("name", project.Name),
	)

	// Validate project name
	if err := s.validateProjectName(project.Name); err != nil {
		s.logger.Error("project name validation failed",
			zap.Error(err),
			zap.String("name", project.Name),
		)
		return err
	}

	// Validate filename format
	if err := s.templateService.ValidateFilenameFormat(project.FilenameFormat); err != nil {
		s.logger.Error("filename format validation failed",
			zap.Error(err),
			zap.String("format", project.FilenameFormat),
		)
		return fmt.Errorf("invalid filename format: %w", err)
	}

	// Update project in repository
	if err := s.repo.Update(project); err != nil {
		s.logger.Error("failed to update project in repository",
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("project updated successfully",
		zap.Int64("id", project.ID),
	)

	return nil
}

// GetProject retrieves a project by ID
func (s *ProjectService) GetProject(id int64) (*models.Project, error) {
	s.logger.Debug("getting project",
		zap.Int64("id", id),
	)

	project, err := s.repo.GetByID(id)
	if err != nil {
		s.logger.Error("failed to get project",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return nil, err
	}

	return project, nil
}

// ListActiveProjects retrieves all active projects
func (s *ProjectService) ListActiveProjects() ([]*models.Project, error) {
	s.logger.Debug("listing active projects")

	projects, err := s.repo.ListActive()
	if err != nil {
		s.logger.Error("failed to list active projects",
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Debug("listed active projects",
		zap.Int("count", len(projects)),
	)

	return projects, nil
}

// ListArchivedProjects retrieves all archived projects
func (s *ProjectService) ListArchivedProjects() ([]*models.Project, error) {
	s.logger.Debug("listing archived projects")

	projects, err := s.repo.ListArchived()
	if err != nil {
		s.logger.Error("failed to list archived projects",
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Debug("listed archived projects",
		zap.Int("count", len(projects)),
	)

	return projects, nil
}

// ArchiveProject marks a project as archived
func (s *ProjectService) ArchiveProject(id int64) error {
	s.logger.Info("archiving project",
		zap.Int64("id", id),
	)

	if err := s.repo.Archive(id); err != nil {
		s.logger.Error("failed to archive project",
			zap.Error(err),
			zap.Int64("id", id),
		)
		return err
	}

	s.logger.Info("project archived successfully",
		zap.Int64("id", id),
	)

	return nil
}

// RenderFilename renders a filename using the project's template
func (s *ProjectService) RenderFilename(project *models.Project, date time.Time) string {
	return s.templateService.RenderFilename(project.Name, project.FilenameFormat, date)
}

// RenderReportTitle renders a report title using the project's template
func (s *ProjectService) RenderReportTitle(project *models.Project, date time.Time) string {
	return s.templateService.RenderReportTitle(project.Name, project.ReportTitleFormat, date)
}

// GetSuggestedFilepath generates a suggested filepath for report export
func (s *ProjectService) GetSuggestedFilepath(project *models.Project, date time.Time) string {
	filename := s.RenderFilename(project, date)

	// Start with default directory
	basePath := project.DefaultDirectory

	// Add year subfolder if enabled
	if project.UseYearSubfolders {
		year := fmt.Sprintf("%04d", date.Year())
		basePath = filepath.Join(basePath, year)
	}

	// Combine with filename
	return filepath.Join(basePath, filename)
}

// validateProjectName validates that a project name is not empty or whitespace-only
func (s *ProjectService) validateProjectName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return fmt.Errorf("project name cannot be empty or whitespace-only")
	}
	return nil
}

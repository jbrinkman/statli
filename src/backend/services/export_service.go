package services

import (
	"fmt"
	"os"
	"path/filepath"
	"src/backend/models"
	"time"

	"github.com/atotto/clipboard"
	"go.uber.org/zap"
)

// ExportService handles file export operations
type ExportService struct {
	templateService *TemplateService
	logger          *zap.Logger
}

// NewExportService creates a new ExportService
func NewExportService(templateService *TemplateService, logger *zap.Logger) *ExportService {
	return &ExportService{
		templateService: templateService,
		logger:          logger,
	}
}

// ExportToFile writes markdown content to a file at the specified path
// It creates the directory structure if it doesn't exist (including year subfolders)
func (s *ExportService) ExportToFile(content string, filePath string) error {
	s.logger.Info("exporting to file",
		zap.String("filepath", filePath),
		zap.Int("content_length", len(content)),
	)

	// Get the directory path
	dir := filepath.Dir(filePath)

	// Create directory structure if it doesn't exist
	if err := os.MkdirAll(dir, 0755); err != nil {
		s.logger.Error("failed to create directory structure",
			zap.Error(err),
			zap.String("directory", dir),
		)
		return fmt.Errorf("failed to create directory: %w", err)
	}

	s.logger.Debug("directory structure created or verified",
		zap.String("directory", dir),
	)

	// Write content to file
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		s.logger.Error("failed to write file",
			zap.Error(err),
			zap.String("filepath", filePath),
		)
		return fmt.Errorf("failed to write file: %w", err)
	}

	s.logger.Info("file exported successfully",
		zap.String("filepath", filePath),
		zap.Int("bytes_written", len(content)),
	)

	return nil
}

// GetSuggestedFilepath generates a suggested filepath for exporting a report
// It uses the project's filename format template and applies year subfolder logic if enabled
func (s *ExportService) GetSuggestedFilepath(project *models.Project, date time.Time) string {
	s.logger.Debug("generating suggested filepath",
		zap.String("project_name", project.Name),
		zap.String("default_directory", project.DefaultDirectory),
		zap.Bool("use_year_subfolders", project.UseYearSubfolders),
	)

	// Render the filename using the template service
	filename := s.templateService.RenderFilename(project.Name, project.FilenameFormat, date)

	// Start with the default directory
	basePath := project.DefaultDirectory

	// Add year subfolder if enabled
	if project.UseYearSubfolders {
		yearFolder := date.Format("2006")
		basePath = filepath.Join(basePath, yearFolder)
		s.logger.Debug("year subfolder enabled",
			zap.String("year_folder", yearFolder),
		)
	}

	// Combine the base path with the filename
	suggestedPath := filepath.Join(basePath, filename)

	s.logger.Info("suggested filepath generated",
		zap.String("suggested_path", suggestedPath),
	)

	return suggestedPath
}

// CopyToClipboard copies the provided content to the system clipboard
func (s *ExportService) CopyToClipboard(content string) error {
	s.logger.Info("copying to clipboard",
		zap.Int("content_length", len(content)),
	)

	if err := clipboard.WriteAll(content); err != nil {
		s.logger.Error("failed to copy to clipboard",
			zap.Error(err),
		)
		return fmt.Errorf("failed to copy to clipboard: %w", err)
	}

	s.logger.Info("content copied to clipboard successfully",
		zap.Int("bytes_copied", len(content)),
	)

	return nil
}

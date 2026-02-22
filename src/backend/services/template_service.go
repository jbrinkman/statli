package services

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"go.uber.org/zap"
)

// TemplateService handles template variable replacement and validation
type TemplateService struct {
	logger *zap.Logger
}

// NewTemplateService creates a new TemplateService
func NewTemplateService(logger *zap.Logger) *TemplateService {
	return &TemplateService{
		logger: logger,
	}
}

// RenderFilename replaces template variables in a filename format
func (s *TemplateService) RenderFilename(projectName, format string, date time.Time) string {
	s.logger.Debug("rendering filename",
		zap.String("project_name", projectName),
		zap.String("format", format),
	)

	result := format
	result = strings.ReplaceAll(result, "{project-name}", sanitizeForFilename(projectName))
	result = strings.ReplaceAll(result, "{YYYY-MM-DD}", date.Format("2006-01-02"))
	result = strings.ReplaceAll(result, "{YYYY}", date.Format("2006"))
	result = strings.ReplaceAll(result, "{MM}", date.Format("01"))
	result = strings.ReplaceAll(result, "{DD}", date.Format("02"))

	return result
}

// RenderReportTitle replaces template variables in a report title format
func (s *TemplateService) RenderReportTitle(projectName, format string, date time.Time) string {
	s.logger.Debug("rendering report title",
		zap.String("project_name", projectName),
		zap.String("format", format),
	)

	result := format
	result = strings.ReplaceAll(result, "{project-name}", projectName)
	result = strings.ReplaceAll(result, "{YYYY-MM-DD}", date.Format("2006-01-02"))
	result = strings.ReplaceAll(result, "{YYYY}", date.Format("2006"))
	result = strings.ReplaceAll(result, "{MM}", date.Format("01"))
	result = strings.ReplaceAll(result, "{DD}", date.Format("02"))

	return result
}

// ValidateFilenameFormat validates that a filename format will produce valid filenames
func (s *TemplateService) ValidateFilenameFormat(format string) error {
	s.logger.Debug("validating filename format",
		zap.String("format", format),
	)

	// Check for invalid filesystem characters
	invalidChars := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	for _, char := range invalidChars {
		if strings.Contains(format, char) {
			return fmt.Errorf("filename format contains invalid character: %s", char)
		}
	}

	// Render with sample data to check result
	sampleDate := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)
	rendered := s.RenderFilename("Sample Project", format, sampleDate)

	// Check rendered result for invalid characters
	for _, char := range invalidChars {
		if strings.Contains(rendered, char) {
			return fmt.Errorf("rendered filename contains invalid character: %s", char)
		}
	}

	return nil
}

// sanitizeForFilename removes or replaces characters that are invalid in filenames
func sanitizeForFilename(s string) string {
	// Replace spaces with hyphens
	s = strings.ReplaceAll(s, " ", "-")

	// Remove invalid filesystem characters
	invalidChars := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	for _, char := range invalidChars {
		s = strings.ReplaceAll(s, char, "")
	}

	// Remove multiple consecutive hyphens
	re := regexp.MustCompile(`-+`)
	s = re.ReplaceAllString(s, "-")

	// Trim hyphens from start and end
	s = strings.Trim(s, "-")

	return s
}

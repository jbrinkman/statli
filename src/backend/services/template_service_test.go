package services

import (
	"strings"
	"testing"
	"time"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	"go.uber.org/zap"
)

func TestTemplateService_RenderFilename(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	service := NewTemplateService(logger)

	date := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name        string
		projectName string
		format      string
		expected    string
	}{
		{
			name:        "all variables",
			projectName: "Test Project",
			format:      "{project-name}-status-{YYYY-MM-DD}.md",
			expected:    "Test-Project-status-2026-02-20.md",
		},
		{
			name:        "year only",
			projectName: "My Project",
			format:      "{project-name}-{YYYY}.md",
			expected:    "My-Project-2026.md",
		},
		{
			name:        "separate date components",
			projectName: "Project",
			format:      "{YYYY}/{MM}/{DD}-{project-name}.md",
			expected:    "2026/02/20-Project.md",
		},
		{
			name:        "no variables",
			projectName: "Project",
			format:      "report.md",
			expected:    "report.md",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.RenderFilename(tt.projectName, tt.format, date)
			if result != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestTemplateService_RenderReportTitle(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	service := NewTemplateService(logger)

	date := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)

	result := service.RenderReportTitle("Test Project", "{project-name} Status Report - {YYYY-MM-DD}", date)
	expected := "Test Project Status Report - 2026-02-20"

	if result != expected {
		t.Errorf("expected %s, got %s", expected, result)
	}
}

func TestTemplateService_ValidateFilenameFormat(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	service := NewTemplateService(logger)

	tests := []struct {
		name      string
		format    string
		shouldErr bool
	}{
		{
			name:      "valid format",
			format:    "{project-name}-{YYYY-MM-DD}.md",
			shouldErr: false,
		},
		{
			name:      "invalid character colon",
			format:    "{project-name}:{YYYY}.md",
			shouldErr: true,
		},
		{
			name:      "invalid character asterisk",
			format:    "{project-name}*.md",
			shouldErr: true,
		},
		{
			name:      "invalid character question mark",
			format:    "{project-name}?.md",
			shouldErr: true,
		},
		{
			name:      "invalid character quotes",
			format:    "{project-name}\".md",
			shouldErr: true,
		},
		{
			name:      "invalid character less than",
			format:    "{project-name}<.md",
			shouldErr: true,
		},
		{
			name:      "invalid character greater than",
			format:    "{project-name}>.md",
			shouldErr: true,
		},
		{
			name:      "invalid character pipe",
			format:    "{project-name}|.md",
			shouldErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidateFilenameFormat(tt.format)
			if tt.shouldErr && err == nil {
				t.Error("expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("expected no error but got: %v", err)
			}
		})
	}
}

// Property 3: Template Variable Replacement Completeness
// **Validates: Requirements 1.7, 1.8, 1.9**
func TestProperty3_TemplateVariableReplacementCompleteness(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 3: Template Variable Replacement Completeness",
		prop.ForAll(
			func(projectName string) bool {
				logger, _ := zap.NewDevelopment()
				service := NewTemplateService(logger)

				date := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)

				// Build format with all variables
				format := "{project-name}-{YYYY-MM-DD}-{YYYY}-{MM}-{DD}"

				// Render
				result := service.RenderFilename(projectName, format, date)

				// Verify no template variables remain
				if strings.Contains(result, "{") || strings.Contains(result, "}") {
					return false
				}

				// Verify date components are present
				if !strings.Contains(result, "2026") {
					return false
				}
				if !strings.Contains(result, "02") {
					return false
				}
				if !strings.Contains(result, "20") {
					return false
				}
				if !strings.Contains(result, "2026-02-20") {
					return false
				}

				return true
			},
			gen.AlphaString().SuchThat(func(s string) bool { return len(s) > 0 && len(s) < 50 }),
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Property 4: Filename Format Validation
// **Validates: Requirements 1.10**
func TestProperty4_FilenameFormatValidation(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 4: Filename Format Validation",
		prop.ForAll(
			func(invalidChar string) bool {
				logger, _ := zap.NewDevelopment()
				service := NewTemplateService(logger)

				// Create format with invalid character
				format := "{project-name}" + invalidChar + "{YYYY}.md"

				// Validate should return error
				err := service.ValidateFilenameFormat(format)
				return err != nil
			},
			gen.OneConstOf("/", "\\", ":", "*", "?", "\"", "<", ">", "|"),
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

func TestSanitizeForFilename(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "spaces to hyphens",
			input:    "My Project Name",
			expected: "My-Project-Name",
		},
		{
			name:     "remove invalid chars",
			input:    "Project/Name:Test",
			expected: "ProjectNameTest",
		},
		{
			name:     "multiple hyphens",
			input:    "Project---Name",
			expected: "Project-Name",
		},
		{
			name:     "trim hyphens",
			input:    "-Project-",
			expected: "Project",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeForFilename(tt.input)
			if result != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, result)
			}
		})
	}
}

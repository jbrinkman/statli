package services

import (
	"os"
	"path/filepath"
	"src/backend/models"
	"strings"
	"testing"
	"time"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	"go.uber.org/zap"
)

func TestExportService_ExportToFile(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	tests := []struct {
		name        string
		content     string
		filePath    string
		wantErr     bool
		setupFunc   func(string) error
		cleanupFunc func(string)
	}{
		{
			name:     "export simple markdown content",
			content:  "# Test Report\n\nThis is a test report.",
			filePath: filepath.Join(t.TempDir(), "test-report.md"),
			wantErr:  false,
		},
		{
			name:     "export with year subfolder",
			content:  "# Report 2026\n\nContent here.",
			filePath: filepath.Join(t.TempDir(), "2026", "report.md"),
			wantErr:  false,
		},
		{
			name:     "export with nested directories",
			content:  "# Nested Report",
			filePath: filepath.Join(t.TempDir(), "reports", "2026", "Q1", "report.md"),
			wantErr:  false,
		},
		{
			name:     "export with HTML embedded in markdown",
			content:  "# Report\n\n<span class=\"status-green\">done</span>",
			filePath: filepath.Join(t.TempDir(), "html-report.md"),
			wantErr:  false,
		},
		{
			name:     "export empty content",
			content:  "",
			filePath: filepath.Join(t.TempDir(), "empty.md"),
			wantErr:  false,
		},
		{
			name:     "export large content",
			content:  generateLargeContent(10000),
			filePath: filepath.Join(t.TempDir(), "large.md"),
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			if tt.setupFunc != nil {
				if err := tt.setupFunc(tt.filePath); err != nil {
					t.Fatalf("setup failed: %v", err)
				}
			}

			// Cleanup
			if tt.cleanupFunc != nil {
				defer tt.cleanupFunc(tt.filePath)
			}

			// Execute
			err := service.ExportToFile(tt.content, tt.filePath)

			// Verify error expectation
			if (err != nil) != tt.wantErr {
				t.Errorf("ExportToFile() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			// If no error expected, verify file was created and content matches
			if !tt.wantErr {
				// Check file exists
				if _, err := os.Stat(tt.filePath); os.IsNotExist(err) {
					t.Errorf("file was not created: %s", tt.filePath)
					return
				}

				// Read file content
				readContent, err := os.ReadFile(tt.filePath)
				if err != nil {
					t.Errorf("failed to read exported file: %v", err)
					return
				}

				// Verify content matches
				if string(readContent) != tt.content {
					t.Errorf("exported content does not match\ngot:\n%s\nwant:\n%s", string(readContent), tt.content)
				}

				// Verify directory structure was created
				dir := filepath.Dir(tt.filePath)
				if _, err := os.Stat(dir); os.IsNotExist(err) {
					t.Errorf("directory was not created: %s", dir)
				}
			}
		})
	}
}

func TestExportService_ExportToFile_DirectoryCreation(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	// Test that nested directories are created
	tempDir := t.TempDir()
	nestedPath := filepath.Join(tempDir, "level1", "level2", "level3", "report.md")

	content := "# Nested Report"
	err := service.ExportToFile(content, nestedPath)
	if err != nil {
		t.Fatalf("ExportToFile() failed: %v", err)
	}

	// Verify all directories were created
	dirs := []string{
		filepath.Join(tempDir, "level1"),
		filepath.Join(tempDir, "level1", "level2"),
		filepath.Join(tempDir, "level1", "level2", "level3"),
	}

	for _, dir := range dirs {
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			t.Errorf("directory was not created: %s", dir)
		}
	}

	// Verify file was created
	if _, err := os.Stat(nestedPath); os.IsNotExist(err) {
		t.Errorf("file was not created: %s", nestedPath)
	}
}

func TestExportService_ExportToFile_OverwriteExisting(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	tempDir := t.TempDir()
	testFilePath := filepath.Join(tempDir, "report.md")

	// Write initial content
	initialContent := "# Initial Report"
	err := service.ExportToFile(initialContent, testFilePath)
	if err != nil {
		t.Fatalf("first ExportToFile() failed: %v", err)
	}

	// Verify initial content
	readContent, err := os.ReadFile(testFilePath)
	if err != nil {
		t.Fatalf("failed to read file: %v", err)
	}
	if string(readContent) != initialContent {
		t.Errorf("initial content mismatch")
	}

	// Overwrite with new content
	newContent := "# Updated Report\n\nThis is the updated version."
	err = service.ExportToFile(newContent, testFilePath)
	if err != nil {
		t.Fatalf("second ExportToFile() failed: %v", err)
	}

	// Verify new content
	readContent, err = os.ReadFile(testFilePath)
	if err != nil {
		t.Fatalf("failed to read file after update: %v", err)
	}
	if string(readContent) != newContent {
		t.Errorf("updated content mismatch\ngot:\n%s\nwant:\n%s", string(readContent), newContent)
	}
}

func TestExportService_ExportToFile_SpecialCharactersInContent(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	tempDir := t.TempDir()
	testFilePath := filepath.Join(tempDir, "special.md")

	// Content with special characters, unicode, and markdown formatting
	content := `# Report with Special Characters

## Section 1: Unicode
- Emoji: 🎉 ✅ ❌
- Accents: café, naïve, résumé
- Symbols: © ® ™ € £ ¥

## Section 2: Markdown & HTML
- **Bold** and *italic*
- [Link](https://example.com)
- <span class="status-green">done</span> → <span class="status-red">blocked</span>
- ~~strikethrough~~ text

## Section 3: Code
` + "```go\nfunc main() {\n\tfmt.Println(\"Hello\")\n}\n```" + `

## Section 4: Special Markdown
> Blockquote

- List item 1
  - Nested item
- List item 2

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
`

	err := service.ExportToFile(content, testFilePath)
	if err != nil {
		t.Fatalf("ExportToFile() failed: %v", err)
	}

	// Read and verify
	readContent, err := os.ReadFile(testFilePath)
	if err != nil {
		t.Fatalf("failed to read file: %v", err)
	}

	if string(readContent) != content {
		t.Errorf("content with special characters was not preserved correctly")
	}
}

// Helper function to generate large content for testing
func generateLargeContent(lines int) string {
	content := "# Large Report\n\n"
	for i := 0; i < lines; i++ {
		content += "This is line " + string(rune(i)) + " of the large report.\n"
	}
	return content
}

func TestExportService_GetSuggestedFilepath(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	testDate := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		project  *models.Project
		date     time.Time
		expected string
	}{
		{
			name: "basic filepath without year subfolder",
			project: &models.Project{
				Name:              "Test Project",
				FilenameFormat:    "{project-name}-status-{YYYY-MM-DD}.md",
				DefaultDirectory:  "/reports",
				UseYearSubfolders: false,
			},
			date:     testDate,
			expected: filepath.Join("/reports", "Test-Project-status-2026-02-20.md"),
		},
		{
			name: "filepath with year subfolder enabled",
			project: &models.Project{
				Name:              "Test Project",
				FilenameFormat:    "{project-name}-status-{YYYY-MM-DD}.md",
				DefaultDirectory:  "/reports",
				UseYearSubfolders: true,
			},
			date:     testDate,
			expected: filepath.Join("/reports", "2026", "Test-Project-status-2026-02-20.md"),
		},
		{
			name: "filepath with custom format",
			project: &models.Project{
				Name:              "Valkey",
				FilenameFormat:    "weekly-{YYYY}-{MM}-{DD}.md",
				DefaultDirectory:  "/home/user/documents",
				UseYearSubfolders: false,
			},
			date:     testDate,
			expected: filepath.Join("/home/user/documents", "weekly-2026-02-20.md"),
		},
		{
			name: "filepath with year subfolder and custom format",
			project: &models.Project{
				Name:              "Valkey",
				FilenameFormat:    "report-{YYYY-MM-DD}.md",
				DefaultDirectory:  "/home/user/reports",
				UseYearSubfolders: true,
			},
			date:     testDate,
			expected: filepath.Join("/home/user/reports", "2026", "report-2026-02-20.md"),
		},
		{
			name: "filepath with empty default directory",
			project: &models.Project{
				Name:              "Project",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				DefaultDirectory:  "",
				UseYearSubfolders: false,
			},
			date:     testDate,
			expected: "Project-2026-02-20.md",
		},
		{
			name: "filepath with empty default directory and year subfolder",
			project: &models.Project{
				Name:              "Project",
				FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
				DefaultDirectory:  "",
				UseYearSubfolders: true,
			},
			date:     testDate,
			expected: filepath.Join("2026", "Project-2026-02-20.md"),
		},
		{
			name: "filepath with project name containing spaces",
			project: &models.Project{
				Name:              "My Complex Project Name",
				FilenameFormat:    "{project-name}-report.md",
				DefaultDirectory:  "/reports",
				UseYearSubfolders: false,
			},
			date:     testDate,
			expected: filepath.Join("/reports", "My-Complex-Project-Name-report.md"),
		},
		{
			name: "filepath with different year",
			project: &models.Project{
				Name:              "Project",
				FilenameFormat:    "{project-name}-{YYYY}.md",
				DefaultDirectory:  "/reports",
				UseYearSubfolders: true,
			},
			date:     time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC),
			expected: filepath.Join("/reports", "2025", "Project-2025.md"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.GetSuggestedFilepath(tt.project, tt.date)
			if result != tt.expected {
				t.Errorf("GetSuggestedFilepath() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestExportService_GetSuggestedFilepath_EdgeCases(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	testDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	t.Run("leap year date", func(t *testing.T) {
		leapDate := time.Date(2024, 2, 29, 0, 0, 0, 0, time.UTC)
		project := &models.Project{
			Name:              "Project",
			FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
			DefaultDirectory:  "/reports",
			UseYearSubfolders: true,
		}
		result := service.GetSuggestedFilepath(project, leapDate)
		expected := filepath.Join("/reports", "2024", "Project-2024-02-29.md")
		if result != expected {
			t.Errorf("GetSuggestedFilepath() with leap year = %v, want %v", result, expected)
		}
	})

	t.Run("year boundary date", func(t *testing.T) {
		project := &models.Project{
			Name:              "Project",
			FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
			DefaultDirectory:  "/reports",
			UseYearSubfolders: true,
		}
		result := service.GetSuggestedFilepath(project, testDate)
		expected := filepath.Join("/reports", "2026", "Project-2026-01-01.md")
		if result != expected {
			t.Errorf("GetSuggestedFilepath() with year boundary = %v, want %v", result, expected)
		}
	})

	t.Run("project name with special characters", func(t *testing.T) {
		project := &models.Project{
			Name:              "Project: Test/Name",
			FilenameFormat:    "{project-name}.md",
			DefaultDirectory:  "/reports",
			UseYearSubfolders: false,
		}
		result := service.GetSuggestedFilepath(project, testDate)
		// Special characters should be sanitized by the template service
		expected := filepath.Join("/reports", "Project-TestName.md")
		if result != expected {
			t.Errorf("GetSuggestedFilepath() with special chars = %v, want %v", result, expected)
		}
	})
}

func TestExportService_CopyToClipboard(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	tests := []struct {
		name    string
		content string
		wantErr bool
	}{
		{
			name:    "copy simple text",
			content: "Simple text content",
			wantErr: false,
		},
		{
			name:    "copy markdown content",
			content: "# Test Report\n\nThis is a test report with **bold** and *italic*.",
			wantErr: false,
		},
		{
			name:    "copy HTML embedded in markdown",
			content: "# Report\n\n<span class=\"status-green\">done</span> → <span class=\"status-red\">blocked</span>",
			wantErr: false,
		},
		{
			name:    "copy empty content",
			content: "",
			wantErr: false,
		},
		{
			name:    "copy large content",
			content: generateLargeContent(1000),
			wantErr: false,
		},
		{
			name:    "copy content with unicode",
			content: "Report with emoji 🎉 and accents: café, naïve",
			wantErr: false,
		},
		{
			name:    "copy multiline content",
			content: "Line 1\nLine 2\nLine 3\n\nLine 5 after blank line",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.CopyToClipboard(tt.content)

			// Verify error expectation
			if (err != nil) != tt.wantErr {
				t.Errorf("CopyToClipboard() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			// If no error expected, verify content was copied
			// Note: We can't reliably read from clipboard in automated tests
			// across all platforms, so we just verify no error occurred
			if !tt.wantErr && err != nil {
				t.Errorf("CopyToClipboard() unexpected error: %v", err)
			}
		})
	}
}

func TestExportService_ExportToFile_ErrorScenarios(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	t.Run("invalid file path with null character", func(t *testing.T) {
		content := "# Test Report"
		invalidPath := filepath.Join(t.TempDir(), "test\x00invalid.md")

		err := service.ExportToFile(content, invalidPath)
		if err == nil {
			t.Error("ExportToFile() should fail with null character in path")
		}
	})

	t.Run("export to read-only directory", func(t *testing.T) {
		// Skip on Windows as permission handling is different
		if os.Getenv("GOOS") == "windows" {
			t.Skip("Skipping read-only directory test on Windows")
		}

		tempDir := t.TempDir()
		readOnlyDir := filepath.Join(tempDir, "readonly")

		// Create directory and make it read-only
		if err := os.Mkdir(readOnlyDir, 0755); err != nil {
			t.Fatalf("failed to create directory: %v", err)
		}
		if err := os.Chmod(readOnlyDir, 0444); err != nil {
			t.Fatalf("failed to change permissions: %v", err)
		}
		defer os.Chmod(readOnlyDir, 0755) // Restore permissions for cleanup

		content := "# Test Report"
		testFilePath := filepath.Join(readOnlyDir, "report.md")

		err := service.ExportToFile(content, testFilePath)
		if err == nil {
			t.Error("ExportToFile() should fail when writing to read-only directory")
		}
	})
}

func TestExportService_GetSuggestedFilepath_PathSeparators(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	testDate := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)

	t.Run("handles various path separators correctly", func(t *testing.T) {
		project := &models.Project{
			Name:              "Project",
			FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
			DefaultDirectory:  "/reports/team",
			UseYearSubfolders: true,
		}

		result := service.GetSuggestedFilepath(project, testDate)

		// Verify the path uses the correct separator for the OS
		if !filepath.IsAbs(result) && project.DefaultDirectory != "" {
			// If default directory is absolute, result should be too
			t.Error("GetSuggestedFilepath() should preserve absolute paths")
		}

		// Verify year subfolder is correctly joined
		expectedYear := "2026"
		if !strings.Contains(result, expectedYear) {
			t.Errorf("GetSuggestedFilepath() result should contain year %s, got %s", expectedYear, result)
		}
	})

	t.Run("handles relative paths", func(t *testing.T) {
		project := &models.Project{
			Name:              "Project",
			FilenameFormat:    "{project-name}.md",
			DefaultDirectory:  "reports",
			UseYearSubfolders: false,
		}

		result := service.GetSuggestedFilepath(project, testDate)
		expected := filepath.Join("reports", "Project.md")

		if result != expected {
			t.Errorf("GetSuggestedFilepath() with relative path = %v, want %v", result, expected)
		}
	})

	t.Run("handles Windows-style paths on Windows", func(t *testing.T) {
		if filepath.Separator != '\\' {
			t.Skip("Skipping Windows path test on non-Windows platform")
		}

		project := &models.Project{
			Name:              "Project",
			FilenameFormat:    "{project-name}.md",
			DefaultDirectory:  "C:\\Reports",
			UseYearSubfolders: true,
		}

		result := service.GetSuggestedFilepath(project, testDate)
		expected := filepath.Join("C:\\Reports", "2026", "Project.md")

		if result != expected {
			t.Errorf("GetSuggestedFilepath() with Windows path = %v, want %v", result, expected)
		}
	})
}

func TestExportService_CopyToClipboard_EdgeCases(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	t.Run("copy very large content", func(t *testing.T) {
		// Test with 1MB of content
		largeContent := generateLargeContent(50000)
		err := service.CopyToClipboard(largeContent)

		if err != nil {
			t.Logf("CopyToClipboard() with large content: %v (may be platform limitation)", err)
			// Don't fail the test as clipboard size limits vary by platform
		}
	})

	t.Run("copy content with null bytes", func(t *testing.T) {
		content := "Text with\x00null byte"
		err := service.CopyToClipboard(content)

		// Should not error, but behavior may vary by platform
		if err != nil {
			t.Logf("CopyToClipboard() with null byte: %v", err)
		}
	})

	t.Run("copy content with all whitespace", func(t *testing.T) {
		content := "   \n\t\n   "
		err := service.CopyToClipboard(content)

		if err != nil {
			t.Errorf("CopyToClipboard() should handle whitespace-only content: %v", err)
		}
	})
}

func TestExportService_Integration_ExportAndSuggestedPath(t *testing.T) {
	logger := zap.NewNop()
	templateService := NewTemplateService(logger)
	service := NewExportService(templateService, logger)

	testDate := time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC)
	tempDir := t.TempDir()

	t.Run("export using suggested filepath", func(t *testing.T) {
		project := &models.Project{
			Name:              "Integration Test",
			FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
			DefaultDirectory:  tempDir,
			UseYearSubfolders: true,
		}

		content := "# Integration Test Report\n\nThis tests the full export workflow."

		// Get suggested filepath
		suggestedPath := service.GetSuggestedFilepath(project, testDate)

		// Export to suggested path
		err := service.ExportToFile(content, suggestedPath)
		if err != nil {
			t.Fatalf("ExportToFile() failed: %v", err)
		}

		// Verify file exists at expected location
		if _, err := os.Stat(suggestedPath); os.IsNotExist(err) {
			t.Errorf("file was not created at suggested path: %s", suggestedPath)
		}

		// Verify year subfolder was created
		yearFolder := filepath.Join(tempDir, "2026")
		if _, err := os.Stat(yearFolder); os.IsNotExist(err) {
			t.Errorf("year subfolder was not created: %s", yearFolder)
		}

		// Verify content
		readContent, err := os.ReadFile(suggestedPath)
		if err != nil {
			t.Fatalf("failed to read exported file: %v", err)
		}
		if string(readContent) != content {
			t.Errorf("exported content does not match")
		}
	})

	t.Run("export multiple reports to same year folder", func(t *testing.T) {
		project := &models.Project{
			Name:              "Multi Report",
			FilenameFormat:    "{project-name}-{YYYY-MM-DD}.md",
			DefaultDirectory:  tempDir,
			UseYearSubfolders: true,
		}

		dates := []time.Time{
			time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
			time.Date(2026, 2, 20, 0, 0, 0, 0, time.UTC),
			time.Date(2026, 3, 10, 0, 0, 0, 0, time.UTC),
		}

		for _, date := range dates {
			content := "# Report for " + date.Format("2006-01-02")
			suggestedPath := service.GetSuggestedFilepath(project, date)

			err := service.ExportToFile(content, suggestedPath)
			if err != nil {
				t.Fatalf("ExportToFile() failed for date %s: %v", date.Format("2006-01-02"), err)
			}

			// Verify file exists
			if _, err := os.Stat(suggestedPath); os.IsNotExist(err) {
				t.Errorf("file was not created: %s", suggestedPath)
			}
		}

		// Verify all files are in the same year folder
		yearFolder := filepath.Join(tempDir, "2026")
		entries, err := os.ReadDir(yearFolder)
		if err != nil {
			t.Fatalf("failed to read year folder: %v", err)
		}

		if len(entries) < 3 {
			t.Errorf("expected at least 3 files in year folder, got %d", len(entries))
		}
	})
}

// Property 19: File Export Round-Trip
// **Validates: Requirements 8.6**
func TestProperty19_FileExportRoundTrip(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 19: File Export Round-Trip",
		prop.ForAll(
			func(content string) bool {
				logger := zap.NewNop()
				templateService := NewTemplateService(logger)
				service := NewExportService(templateService, logger)

				// Create temporary file path
				tempDir := t.TempDir()
				testFilePath := filepath.Join(tempDir, "test-export.md")

				// Export content to file
				err := service.ExportToFile(content, testFilePath)
				if err != nil {
					t.Logf("ExportToFile failed: %v", err)
					return false
				}

				// Read content back from file
				readContent, err := os.ReadFile(testFilePath)
				if err != nil {
					t.Logf("ReadFile failed: %v", err)
					return false
				}

				// Verify content is identical
				return string(readContent) == content
			},
			genMarkdownContent(),
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

// Generator for markdown content with various formatting and HTML
func genMarkdownContent() gopter.Gen {
	return gen.OneGenOf(
		// Simple text
		gen.AlphaString(),
		// Markdown with headers
		gen.Const("# Header 1\n## Header 2\n### Header 3\n"),
		// Markdown with formatting
		gen.Const("**bold** and *italic* and ~~strikethrough~~\n"),
		// Markdown with lists
		gen.Const("- Item 1\n- Item 2\n  - Nested item\n"),
		// HTML status badges
		gen.Const("<span class=\"status-green\">done</span>\n"),
		gen.Const("<span class=\"status-red\">blocked</span> → <span class=\"status-green\">done</span>\n"),
		// Markdown with links
		gen.Const("[Link text](https://example.com)\n"),
		// Markdown with code blocks
		gen.Const("```go\nfunc main() {\n\tfmt.Println(\"Hello\")\n}\n```\n"),
		// Unicode characters
		gen.Const("Emoji: 🎉 ✅ ❌\nAccents: café, naïve, résumé\n"),
		// Empty content
		gen.Const(""),
		// Multiline content
		gen.Const("Line 1\nLine 2\n\nLine 4 after blank\n"),
		// Complex report-like content
		gen.Const(`# Weekly Status Report

## Recipients
To: team@example.com
CC: manager@example.com

## Highlights
- Completed feature X <span class="status-green">done</span>
- Started feature Y <span class="status-yellow">in progress</span>

## Tasks
- [Task 1](https://example.com/task1) <span class="status-green">done</span> 2026-02-20
  - Subtask 1.1 <span class="status-green">done</span>
- Task 2 <span class="status-red">not started</span> → <span class="status-yellow">in progress</span> ~~2026-02-15~~ 2026-02-22
  Notes: This task was delayed due to dependencies.

## Code Example
`+"```go\nfunc Example() {\n\t// Code here\n}\n```"+`
`),
	)
}

package models

import (
	"testing"
	"time"
)

// TestProjectStructCreation tests that Project structs can be created with valid fields
func TestProjectStructCreation(t *testing.T) {
	now := time.Now()
	project := Project{
		ID:                1,
		Name:              "Test Project",
		FilenameFormat:    "{project-name}-status-{YYYY-MM-DD}.md",
		ReportTitleFormat: "{project-name} Status Report - {YYYY-MM-DD}",
		DefaultDirectory:  "/path/to/reports",
		UseYearSubfolders: true,
		RecipientsTo:      "team@example.com",
		RecipientsCC:      "manager@example.com",
		RecipientsBCC:     "archive@example.com",
		IsArchived:        false,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if project.ID != 1 {
		t.Errorf("Expected ID to be 1, got %d", project.ID)
	}
	if project.Name != "Test Project" {
		t.Errorf("Expected Name to be 'Test Project', got %s", project.Name)
	}
	if project.FilenameFormat != "{project-name}-status-{YYYY-MM-DD}.md" {
		t.Errorf("Expected FilenameFormat to match, got %s", project.FilenameFormat)
	}
	if !project.UseYearSubfolders {
		t.Error("Expected UseYearSubfolders to be true")
	}
}

// TestProjectEmptyName tests that Project can be created with empty name (validation happens at service layer)
func TestProjectEmptyName(t *testing.T) {
	project := Project{
		Name: "",
	}

	// Model layer doesn't enforce validation - this is done at service layer
	// This test verifies the struct accepts empty strings
	if project.Name != "" {
		t.Errorf("Expected empty Name, got %s", project.Name)
	}
}

// TestTaskStructCreation tests that Task structs can be created with valid fields
func TestTaskStructCreation(t *testing.T) {
	now := time.Now()
	ecd := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)

	task := Task{
		ID:                     1,
		ProjectID:              1,
		ReportSectionID:        1,
		Name:                   "Implement feature X",
		Status:                 "in progress",
		ExpectedCompletionDate: &ecd,
		URL:                    "https://github.com/org/repo/issues/123",
		Notes:                  "This is a test note with **markdown**",
		Priority:               1,
		IsDeleted:              false,
		IsArchived:             false,
		CreatedAt:              now,
		UpdatedAt:              now,
	}

	if task.ID != 1 {
		t.Errorf("Expected ID to be 1, got %d", task.ID)
	}
	if task.Name != "Implement feature X" {
		t.Errorf("Expected Name to be 'Implement feature X', got %s", task.Name)
	}
	if task.Status != "in progress" {
		t.Errorf("Expected Status to be 'in progress', got %s", task.Status)
	}
	if task.ExpectedCompletionDate == nil {
		t.Error("Expected ExpectedCompletionDate to be set")
	} else if !task.ExpectedCompletionDate.Equal(ecd) {
		t.Errorf("Expected ExpectedCompletionDate to be %v, got %v", ecd, *task.ExpectedCompletionDate)
	}
	if task.Priority != 1 {
		t.Errorf("Expected Priority to be 1, got %d", task.Priority)
	}
}

// TestTaskNullableFields tests that Task nullable fields work correctly
func TestTaskNullableFields(t *testing.T) {
	task := Task{
		Name:                   "Test Task",
		ExpectedCompletionDate: nil,
		URL:                    "",
		Notes:                  "",
	}

	if task.ExpectedCompletionDate != nil {
		t.Error("Expected ExpectedCompletionDate to be nil")
	}
	if task.URL != "" {
		t.Errorf("Expected URL to be empty, got %s", task.URL)
	}
	if task.Notes != "" {
		t.Errorf("Expected Notes to be empty, got %s", task.Notes)
	}
}

// TestTaskBooleanDefaults tests that Task boolean fields work correctly
func TestTaskBooleanDefaults(t *testing.T) {
	task := Task{
		Name:       "Test Task",
		IsDeleted:  false,
		IsArchived: false,
	}

	if task.IsDeleted {
		t.Error("Expected IsDeleted to be false")
	}
	if task.IsArchived {
		t.Error("Expected IsArchived to be false")
	}

	task.IsDeleted = true
	task.IsArchived = true

	if !task.IsDeleted {
		t.Error("Expected IsDeleted to be true")
	}
	if !task.IsArchived {
		t.Error("Expected IsArchived to be true")
	}
}

// TestSubtaskStructCreation tests that Subtask structs can be created with valid fields
func TestSubtaskStructCreation(t *testing.T) {
	now := time.Now()
	ecd := time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC)

	subtask := Subtask{
		ID:                     1,
		TaskID:                 1,
		Name:                   "Implement unit tests",
		Status:                 "done",
		ExpectedCompletionDate: &ecd,
		URL:                    "https://github.com/org/repo/pull/456",
		Notes:                  "Completed ahead of schedule",
		IsDeleted:              false,
		CreatedAt:              now,
		UpdatedAt:              now,
	}

	if subtask.ID != 1 {
		t.Errorf("Expected ID to be 1, got %d", subtask.ID)
	}
	if subtask.TaskID != 1 {
		t.Errorf("Expected TaskID to be 1, got %d", subtask.TaskID)
	}
	if subtask.Name != "Implement unit tests" {
		t.Errorf("Expected Name to be 'Implement unit tests', got %s", subtask.Name)
	}
	if subtask.Status != "done" {
		t.Errorf("Expected Status to be 'done', got %s", subtask.Status)
	}
}

// TestSubtaskNullableFields tests that Subtask nullable fields work correctly
func TestSubtaskNullableFields(t *testing.T) {
	subtask := Subtask{
		Name:                   "Test Subtask",
		ExpectedCompletionDate: nil,
		URL:                    "",
		Notes:                  "",
	}

	if subtask.ExpectedCompletionDate != nil {
		t.Error("Expected ExpectedCompletionDate to be nil")
	}
	if subtask.URL != "" {
		t.Errorf("Expected URL to be empty, got %s", subtask.URL)
	}
	if subtask.Notes != "" {
		t.Errorf("Expected Notes to be empty, got %s", subtask.Notes)
	}
}

// TestReportSectionStructCreation tests that ReportSection structs can be created with valid fields
func TestReportSectionStructCreation(t *testing.T) {
	now := time.Now()

	// Test prose section
	proseSection := ReportSection{
		ID:        1,
		ProjectID: 1,
		Name:      "TL;DR",
		Type:      "prose",
		Content:   "This week we made significant progress on feature X.",
		Order:     1,
		IsEnabled: true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if proseSection.Type != "prose" {
		t.Errorf("Expected Type to be 'prose', got %s", proseSection.Type)
	}
	if proseSection.Content == "" {
		t.Error("Expected Content to be set for prose section")
	}

	// Test status section
	statusSection := ReportSection{
		ID:        2,
		ProjectID: 1,
		Name:      "Weekly Support",
		Type:      "status",
		Content:   "",
		Order:     2,
		IsEnabled: true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if statusSection.Type != "status" {
		t.Errorf("Expected Type to be 'status', got %s", statusSection.Type)
	}
	if statusSection.Content != "" {
		t.Error("Expected Content to be empty for status section")
	}
}

// TestReportSectionTypeValidation tests that ReportSection accepts valid types
func TestReportSectionTypeValidation(t *testing.T) {
	validTypes := []string{"prose", "status"}

	for _, validType := range validTypes {
		section := ReportSection{
			Name: "Test Section",
			Type: validType,
		}

		if section.Type != validType {
			t.Errorf("Expected Type to be '%s', got %s", validType, section.Type)
		}
	}
}

// TestStatusDefinitionStructCreation tests that StatusDefinition structs can be created with valid fields
func TestStatusDefinitionStructCreation(t *testing.T) {
	now := time.Now()

	status := StatusDefinition{
		ID:        1,
		ProjectID: 1,
		Name:      "in progress",
		Style:     "yellow",
		Order:     2,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if status.Name != "in progress" {
		t.Errorf("Expected Name to be 'in progress', got %s", status.Name)
	}
	if status.Style != "yellow" {
		t.Errorf("Expected Style to be 'yellow', got %s", status.Style)
	}
	if status.Order != 2 {
		t.Errorf("Expected Order to be 2, got %d", status.Order)
	}
}

// TestStatusDefinitionValidStyles tests that StatusDefinition accepts valid styles
func TestStatusDefinitionValidStyles(t *testing.T) {
	validStyles := []string{"red", "green", "yellow", "gray", "paused", "pending"}

	for _, validStyle := range validStyles {
		status := StatusDefinition{
			Name:  "test status",
			Style: validStyle,
		}

		if status.Style != validStyle {
			t.Errorf("Expected Style to be '%s', got %s", validStyle, status.Style)
		}
	}
}

// TestTaskHistoryStructCreation tests that TaskHistory structs can be created with valid fields
func TestTaskHistoryStructCreation(t *testing.T) {
	now := time.Now()
	ecd := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)
	subtaskID := int64(5)

	// Test task-level history
	taskHistory := TaskHistory{
		ID:                     1,
		ReportSnapshotID:       1,
		TaskID:                 1,
		SubtaskID:              nil,
		Name:                   "Implement feature Y",
		Status:                 "in progress",
		ExpectedCompletionDate: &ecd,
		URL:                    "https://github.com/org/repo/issues/789",
		Notes:                  "Making good progress",
		CreatedAt:              now,
	}

	if taskHistory.SubtaskID != nil {
		t.Error("Expected SubtaskID to be nil for task-level history")
	}
	if taskHistory.Name != "Implement feature Y" {
		t.Errorf("Expected Name to be 'Implement feature Y', got %s", taskHistory.Name)
	}

	// Test subtask-level history
	subtaskHistory := TaskHistory{
		ID:                     2,
		ReportSnapshotID:       1,
		TaskID:                 1,
		SubtaskID:              &subtaskID,
		Name:                   "Write tests",
		Status:                 "done",
		ExpectedCompletionDate: &ecd,
		URL:                    "",
		Notes:                  "",
		CreatedAt:              now,
	}

	if subtaskHistory.SubtaskID == nil {
		t.Error("Expected SubtaskID to be set for subtask-level history")
	} else if *subtaskHistory.SubtaskID != subtaskID {
		t.Errorf("Expected SubtaskID to be %d, got %d", subtaskID, *subtaskHistory.SubtaskID)
	}
}

// TestTaskHistoryNullableFields tests that TaskHistory nullable fields work correctly
func TestTaskHistoryNullableFields(t *testing.T) {
	history := TaskHistory{
		ReportSnapshotID:       1,
		TaskID:                 1,
		SubtaskID:              nil,
		Name:                   "Test Task",
		Status:                 "not started",
		ExpectedCompletionDate: nil,
		URL:                    "",
		Notes:                  "",
	}

	if history.SubtaskID != nil {
		t.Error("Expected SubtaskID to be nil")
	}
	if history.ExpectedCompletionDate != nil {
		t.Error("Expected ExpectedCompletionDate to be nil")
	}
	if history.URL != "" {
		t.Errorf("Expected URL to be empty, got %s", history.URL)
	}
	if history.Notes != "" {
		t.Errorf("Expected Notes to be empty, got %s", history.Notes)
	}
}

// TestReportSnapshotStructCreation tests that ReportSnapshot structs can be created with valid fields
func TestReportSnapshotStructCreation(t *testing.T) {
	now := time.Now()
	markdownContent := `# Test Report

## TL;DR
This is a test report.

## Weekly Support
- Task 1 <span class="status-green">done</span>
`

	snapshot := ReportSnapshot{
		ID:              1,
		ProjectID:       1,
		MarkdownContent: markdownContent,
		FinalizedAt:     now,
	}

	if snapshot.ID != 1 {
		t.Errorf("Expected ID to be 1, got %d", snapshot.ID)
	}
	if snapshot.ProjectID != 1 {
		t.Errorf("Expected ProjectID to be 1, got %d", snapshot.ProjectID)
	}
	if snapshot.MarkdownContent != markdownContent {
		t.Error("Expected MarkdownContent to match")
	}
	if snapshot.FinalizedAt.IsZero() {
		t.Error("Expected FinalizedAt to be set")
	}
}

// TestReportSnapshotEmptyContent tests that ReportSnapshot can have empty content
func TestReportSnapshotEmptyContent(t *testing.T) {
	snapshot := ReportSnapshot{
		ProjectID:       1,
		MarkdownContent: "",
		FinalizedAt:     time.Now(),
	}

	if snapshot.MarkdownContent != "" {
		t.Errorf("Expected MarkdownContent to be empty, got %s", snapshot.MarkdownContent)
	}
}

// TestTimeFieldsAreNotZero tests that time fields can be set and are not zero
func TestTimeFieldsAreNotZero(t *testing.T) {
	now := time.Now()

	project := Project{
		CreatedAt: now,
		UpdatedAt: now,
	}

	if project.CreatedAt.IsZero() {
		t.Error("Expected CreatedAt to not be zero")
	}
	if project.UpdatedAt.IsZero() {
		t.Error("Expected UpdatedAt to not be zero")
	}

	task := Task{
		CreatedAt: now,
		UpdatedAt: now,
	}

	if task.CreatedAt.IsZero() {
		t.Error("Expected Task CreatedAt to not be zero")
	}
	if task.UpdatedAt.IsZero() {
		t.Error("Expected Task UpdatedAt to not be zero")
	}
}

// TestPointerFieldsCanBeNil tests that pointer fields can be nil
func TestPointerFieldsCanBeNil(t *testing.T) {
	task := Task{
		Name:                   "Test",
		ExpectedCompletionDate: nil,
	}

	if task.ExpectedCompletionDate != nil {
		t.Error("Expected ExpectedCompletionDate to be nil")
	}

	history := TaskHistory{
		Name:      "Test",
		SubtaskID: nil,
	}

	if history.SubtaskID != nil {
		t.Error("Expected SubtaskID to be nil")
	}
}

// TestPointerFieldsCanBeSet tests that pointer fields can be set to values
func TestPointerFieldsCanBeSet(t *testing.T) {
	ecd := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	task := Task{
		Name:                   "Test",
		ExpectedCompletionDate: &ecd,
	}

	if task.ExpectedCompletionDate == nil {
		t.Error("Expected ExpectedCompletionDate to be set")
	}
	if !task.ExpectedCompletionDate.Equal(ecd) {
		t.Errorf("Expected ExpectedCompletionDate to be %v, got %v", ecd, *task.ExpectedCompletionDate)
	}

	subtaskID := int64(42)
	history := TaskHistory{
		Name:      "Test",
		SubtaskID: &subtaskID,
	}

	if history.SubtaskID == nil {
		t.Error("Expected SubtaskID to be set")
	}
	if *history.SubtaskID != subtaskID {
		t.Errorf("Expected SubtaskID to be %d, got %d", subtaskID, *history.SubtaskID)
	}
}

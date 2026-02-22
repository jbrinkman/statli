package models

import "time"

// Task represents a main work item with status, completion date, and associated subtasks
type Task struct {
	ID                     int64      `json:"id"`
	ProjectID              int64      `json:"project_id"`
	ReportSectionID        int64      `json:"report_section_id"`
	Name                   string     `json:"name"`
	Status                 string     `json:"status"`
	ExpectedCompletionDate *time.Time `json:"expected_completion_date"`
	URL                    string     `json:"url"`
	Notes                  string     `json:"notes"`
	Priority               int        `json:"priority"`
	IsDeleted              bool       `json:"is_deleted"`
	IsArchived             bool       `json:"is_archived"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

package models

import "time"

// Subtask represents a breakdown of a parent task with its own status and completion date
type Subtask struct {
	ID                     int64      `json:"id"`
	TaskID                 int64      `json:"task_id"`
	Name                   string     `json:"name"`
	Status                 string     `json:"status"`
	ExpectedCompletionDate *time.Time `json:"expected_completion_date"`
	URL                    string     `json:"url"`
	Notes                  string     `json:"notes"`
	IsDeleted              bool       `json:"is_deleted"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

package models

import "time"

// TaskHistory represents an audit trail entry recording the state of tasks and subtasks at report finalization time
type TaskHistory struct {
	ID                     int64      `json:"id"`
	ReportSnapshotID       int64      `json:"report_snapshot_id"`
	TaskID                 int64      `json:"task_id"`
	SubtaskID              *int64     `json:"subtask_id"` // NULL for task-level history
	Name                   string     `json:"name"`
	Status                 string     `json:"status"`
	ExpectedCompletionDate *time.Time `json:"expected_completion_date"`
	URL                    string     `json:"url"`
	Notes                  string     `json:"notes"`
	CreatedAt              time.Time  `json:"created_at"`
}

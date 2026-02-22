package models

import "time"

// ReportSnapshot represents a finalized report with captured task states at that point in time
type ReportSnapshot struct {
	ID              int64     `json:"id"`
	ProjectID       int64     `json:"project_id"`
	MarkdownContent string    `json:"markdown_content"`
	FinalizedAt     time.Time `json:"finalized_at"`
}

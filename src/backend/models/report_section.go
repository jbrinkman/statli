package models

import "time"

// ReportSection represents a configured section in a report template (prose or status type)
type ReportSection struct {
	ID        int64     `json:"id"`
	ProjectID int64     `json:"project_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`    // "prose" or "status"
	Content   string    `json:"content"` // For prose sections
	Order     int       `json:"order"`
	IsEnabled bool      `json:"is_enabled"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

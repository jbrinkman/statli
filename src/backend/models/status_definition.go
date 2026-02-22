package models

import "time"

// StatusDefinition represents a custom status with associated styling for a project
type StatusDefinition struct {
	ID        int64     `json:"id"`
	ProjectID int64     `json:"project_id"`
	Name      string    `json:"name"`
	Style     string    `json:"style"` // red, green, yellow, gray, paused, pending
	Order     int       `json:"order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

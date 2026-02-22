package models

import "time"

// Project represents a project with configuration settings for report generation
type Project struct {
	ID                int64     `json:"id"`
	Name              string    `json:"name"`
	FilenameFormat    string    `json:"filename_format"`
	ReportTitleFormat string    `json:"report_title_format"`
	DefaultDirectory  string    `json:"default_directory"`
	UseYearSubfolders bool      `json:"use_year_subfolders"`
	RecipientsTo      string    `json:"recipients_to"`
	RecipientsCC      string    `json:"recipients_cc"`
	RecipientsBCC     string    `json:"recipients_bcc"`
	IsArchived        bool      `json:"is_archived"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

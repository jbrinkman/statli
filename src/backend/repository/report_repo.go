package repository

import (
	"database/sql"
	"fmt"
	"time"

	"src/backend/models"

	"go.uber.org/zap"
)

// ReportRepository handles database operations for reports
type ReportRepository struct {
	db     *DB
	logger *zap.Logger
}

// NewReportRepository creates a new ReportRepository
func NewReportRepository(db *DB) *ReportRepository {
	return &ReportRepository{
		db:     db,
		logger: db.Logger,
	}
}

// CreateReportSection inserts a new report section
func (r *ReportRepository) CreateReportSection(section *models.ReportSection) error {
	query := `
		INSERT INTO report_sections (project_id, name, type, content, order_index, is_enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	now := time.Now()
	result, err := r.db.Conn.Exec(query, section.ProjectID, section.Name, section.Type,
		section.Content, section.Order, section.IsEnabled, now, now)
	if err != nil {
		return fmt.Errorf("failed to create report section: %w", err)
	}

	id, _ := result.LastInsertId()
	section.ID = id
	section.CreatedAt = now
	section.UpdatedAt = now
	return nil
}

// UpdateReportSection updates an existing report section
func (r *ReportRepository) UpdateReportSection(section *models.ReportSection) error {
	query := `
		UPDATE report_sections SET name = ?, type = ?, content = ?, order_index = ?, is_enabled = ?, updated_at = ?
		WHERE id = ?
	`

	now := time.Now()
	result, err := r.db.Conn.Exec(query, section.Name, section.Type, section.Content,
		section.Order, section.IsEnabled, now, section.ID)
	if err != nil {
		return fmt.Errorf("failed to update report section: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("report section not found: %d", section.ID)
	}

	section.UpdatedAt = now
	return nil
}

// GetReportSectionByID retrieves a report section by ID
func (r *ReportRepository) GetReportSectionByID(id int64) (*models.ReportSection, error) {
	query := `
		SELECT id, project_id, name, type, content, order_index, is_enabled, created_at, updated_at
		FROM report_sections WHERE id = ?
	`

	section := &models.ReportSection{}
	err := r.db.Conn.QueryRow(query, id).Scan(&section.ID, &section.ProjectID, &section.Name,
		&section.Type, &section.Content, &section.Order, &section.IsEnabled, &section.CreatedAt, &section.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("report section not found: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get report section: %w", err)
	}

	return section, nil
}

// ListReportSections retrieves all report sections for a project
func (r *ReportRepository) ListReportSections(projectID int64) ([]*models.ReportSection, error) {
	query := `
		SELECT id, project_id, name, type, content, order_index, is_enabled, created_at, updated_at
		FROM report_sections WHERE project_id = ? ORDER BY order_index ASC
	`

	rows, err := r.db.Conn.Query(query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list report sections: %w", err)
	}
	defer rows.Close()

	sections := []*models.ReportSection{}
	for rows.Next() {
		section := &models.ReportSection{}
		err := rows.Scan(&section.ID, &section.ProjectID, &section.Name, &section.Type,
			&section.Content, &section.Order, &section.IsEnabled, &section.CreatedAt, &section.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan report section: %w", err)
		}
		sections = append(sections, section)
	}

	return sections, rows.Err()
}

// CreateStatusDefinition inserts a new status definition
func (r *ReportRepository) CreateStatusDefinition(status *models.StatusDefinition) error {
	query := `
		INSERT INTO status_definitions (project_id, name, style, order_index, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	now := time.Now()
	result, err := r.db.Conn.Exec(query, status.ProjectID, status.Name, status.Style, status.Order, now, now)
	if err != nil {
		return fmt.Errorf("failed to create status definition: %w", err)
	}

	id, _ := result.LastInsertId()
	status.ID = id
	status.CreatedAt = now
	status.UpdatedAt = now
	return nil
}

// UpdateStatusDefinition updates an existing status definition
func (r *ReportRepository) UpdateStatusDefinition(status *models.StatusDefinition) error {
	query := `UPDATE status_definitions SET name = ?, style = ?, order_index = ?, updated_at = ? WHERE id = ?`

	now := time.Now()
	result, err := r.db.Conn.Exec(query, status.Name, status.Style, status.Order, now, status.ID)
	if err != nil {
		return fmt.Errorf("failed to update status definition: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("status definition not found: %d", status.ID)
	}

	status.UpdatedAt = now
	return nil
}

// ListStatusDefinitions retrieves all status definitions for a project
func (r *ReportRepository) ListStatusDefinitions(projectID int64) ([]*models.StatusDefinition, error) {
	query := `
		SELECT id, project_id, name, style, order_index, created_at, updated_at
		FROM status_definitions WHERE project_id = ? ORDER BY order_index ASC
	`

	rows, err := r.db.Conn.Query(query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list status definitions: %w", err)
	}
	defer rows.Close()

	statuses := []*models.StatusDefinition{}
	for rows.Next() {
		status := &models.StatusDefinition{}
		err := rows.Scan(&status.ID, &status.ProjectID, &status.Name, &status.Style, &status.Order, &status.CreatedAt, &status.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan status definition: %w", err)
		}
		statuses = append(statuses, status)
	}

	return statuses, rows.Err()
}

// CreateReportSnapshot inserts a new report snapshot
func (r *ReportRepository) CreateReportSnapshot(snapshot *models.ReportSnapshot) error {
	query := `INSERT INTO report_snapshots (project_id, markdown_content, finalized_at) VALUES (?, ?, ?)`

	result, err := r.db.Conn.Exec(query, snapshot.ProjectID, snapshot.MarkdownContent, snapshot.FinalizedAt)
	if err != nil {
		return fmt.Errorf("failed to create report snapshot: %w", err)
	}

	id, _ := result.LastInsertId()
	snapshot.ID = id
	return nil
}

// GetReportSnapshotByID retrieves a report snapshot by ID
func (r *ReportRepository) GetReportSnapshotByID(id int64) (*models.ReportSnapshot, error) {
	query := `SELECT id, project_id, markdown_content, finalized_at FROM report_snapshots WHERE id = ?`

	snapshot := &models.ReportSnapshot{}
	err := r.db.Conn.QueryRow(query, id).Scan(&snapshot.ID, &snapshot.ProjectID, &snapshot.MarkdownContent, &snapshot.FinalizedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("report snapshot not found: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get report snapshot: %w", err)
	}

	return snapshot, nil
}

// ListReportSnapshots retrieves all report snapshots for a project
func (r *ReportRepository) ListReportSnapshots(projectID int64) ([]*models.ReportSnapshot, error) {
	query := `SELECT id, project_id, markdown_content, finalized_at FROM report_snapshots WHERE project_id = ? ORDER BY finalized_at DESC`

	rows, err := r.db.Conn.Query(query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list report snapshots: %w", err)
	}
	defer rows.Close()

	snapshots := []*models.ReportSnapshot{}
	for rows.Next() {
		snapshot := &models.ReportSnapshot{}
		err := rows.Scan(&snapshot.ID, &snapshot.ProjectID, &snapshot.MarkdownContent, &snapshot.FinalizedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan report snapshot: %w", err)
		}
		snapshots = append(snapshots, snapshot)
	}

	return snapshots, rows.Err()
}

// CreateTaskHistory inserts a new task history entry
func (r *ReportRepository) CreateTaskHistory(history *models.TaskHistory) error {
	query := `
		INSERT INTO task_history (report_snapshot_id, task_id, subtask_id, name, status, expected_completion_date, url, notes, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	result, err := r.db.Conn.Exec(query, history.ReportSnapshotID, history.TaskID, history.SubtaskID,
		history.Name, history.Status, history.ExpectedCompletionDate, history.URL, history.Notes, history.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create task history: %w", err)
	}

	id, _ := result.LastInsertId()
	history.ID = id
	return nil
}

// GetTaskHistoryBySnapshot retrieves task history for a snapshot
func (r *ReportRepository) GetTaskHistoryBySnapshot(snapshotID int64) ([]*models.TaskHistory, error) {
	query := `
		SELECT id, report_snapshot_id, task_id, subtask_id, name, status, expected_completion_date, url, notes, created_at
		FROM task_history WHERE report_snapshot_id = ? ORDER BY task_id, subtask_id
	`

	rows, err := r.db.Conn.Query(query, snapshotID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task history: %w", err)
	}
	defer rows.Close()

	histories := []*models.TaskHistory{}
	for rows.Next() {
		history := &models.TaskHistory{}
		err := rows.Scan(&history.ID, &history.ReportSnapshotID, &history.TaskID, &history.SubtaskID,
			&history.Name, &history.Status, &history.ExpectedCompletionDate, &history.URL, &history.Notes, &history.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task history: %w", err)
		}
		histories = append(histories, history)
	}

	return histories, rows.Err()
}

// GetLastTaskHistory retrieves the most recent task history for a task
func (r *ReportRepository) GetLastTaskHistory(taskID int64, subtaskID *int64) (*models.TaskHistory, error) {
	var query string
	var args []interface{}

	if subtaskID == nil {
		query = `
			SELECT id, report_snapshot_id, task_id, subtask_id, name, status, expected_completion_date, url, notes, created_at
			FROM task_history WHERE task_id = ? AND subtask_id IS NULL
			ORDER BY created_at DESC LIMIT 1
		`
		args = []interface{}{taskID}
	} else {
		query = `
			SELECT id, report_snapshot_id, task_id, subtask_id, name, status, expected_completion_date, url, notes, created_at
			FROM task_history WHERE task_id = ? AND subtask_id = ?
			ORDER BY created_at DESC LIMIT 1
		`
		args = []interface{}{taskID, *subtaskID}
	}

	history := &models.TaskHistory{}
	err := r.db.Conn.QueryRow(query, args...).Scan(&history.ID, &history.ReportSnapshotID, &history.TaskID,
		&history.SubtaskID, &history.Name, &history.Status, &history.ExpectedCompletionDate, &history.URL, &history.Notes, &history.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil // No history found is not an error
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get last task history: %w", err)
	}

	return history, nil
}

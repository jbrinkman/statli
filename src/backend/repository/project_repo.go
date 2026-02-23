package repository

import (
	"database/sql"
	"fmt"
	"time"

	"src/backend/models"

	"go.uber.org/zap"
)

// ProjectRepository handles database operations for projects
type ProjectRepository struct {
	db     *DB
	logger *zap.Logger
}

// NewProjectRepository creates a new ProjectRepository
func NewProjectRepository(db *DB) *ProjectRepository {
	return &ProjectRepository{
		db:     db,
		logger: db.Logger,
	}
}

// Create inserts a new project into the database
func (r *ProjectRepository) Create(project *models.Project) error {
	r.logger.Info("creating project",
		zap.String("name", project.Name),
	)

	query := `
		INSERT INTO projects (
			name, filename_format, report_title_format, default_directory,
			use_year_subfolders, recipients_to, recipients_cc, recipients_bcc,
			master_stylesheet, is_archived, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	now := time.Now()
	result, err := r.db.Conn.Exec(
		query,
		project.Name,
		project.FilenameFormat,
		project.ReportTitleFormat,
		project.DefaultDirectory,
		project.UseYearSubfolders,
		project.RecipientsTo,
		project.RecipientsCC,
		project.RecipientsBCC,
		project.MasterStylesheet,
		project.IsArchived,
		now,
		now,
	)
	if err != nil {
		r.logger.Error("failed to create project", zap.Error(err))
		return fmt.Errorf("failed to create project: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id: %w", err)
	}

	project.ID = id
	project.CreatedAt = now
	project.UpdatedAt = now

	r.logger.Info("project created successfully",
		zap.Int64("id", project.ID),
		zap.String("name", project.Name),
	)

	return nil
}

// Update updates an existing project in the database
func (r *ProjectRepository) Update(project *models.Project) error {
	r.logger.Info("updating project",
		zap.Int64("id", project.ID),
		zap.String("name", project.Name),
	)

	query := `
		UPDATE projects SET
			name = ?,
			filename_format = ?,
			report_title_format = ?,
			default_directory = ?,
			use_year_subfolders = ?,
			recipients_to = ?,
			recipients_cc = ?,
			recipients_bcc = ?,
			master_stylesheet = ?,
			is_archived = ?,
			updated_at = ?
		WHERE id = ?
	`

	now := time.Now()
	result, err := r.db.Conn.Exec(
		query,
		project.Name,
		project.FilenameFormat,
		project.ReportTitleFormat,
		project.DefaultDirectory,
		project.UseYearSubfolders,
		project.RecipientsTo,
		project.RecipientsCC,
		project.RecipientsBCC,
		project.MasterStylesheet,
		project.IsArchived,
		now,
		project.ID,
	)
	if err != nil {
		r.logger.Error("failed to update project", zap.Error(err))
		return fmt.Errorf("failed to update project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project not found: %d", project.ID)
	}

	project.UpdatedAt = now

	r.logger.Info("project updated successfully",
		zap.Int64("id", project.ID),
	)

	return nil
}

// GetByID retrieves a project by its ID
func (r *ProjectRepository) GetByID(id int64) (*models.Project, error) {
	r.logger.Debug("getting project by id",
		zap.Int64("id", id),
	)

	query := `
		SELECT id, name, filename_format, report_title_format, default_directory,
			use_year_subfolders, recipients_to, recipients_cc, recipients_bcc,
			master_stylesheet, is_archived, created_at, updated_at
		FROM projects
		WHERE id = ?
	`

	project := &models.Project{}
	err := r.db.Conn.QueryRow(query, id).Scan(
		&project.ID,
		&project.Name,
		&project.FilenameFormat,
		&project.ReportTitleFormat,
		&project.DefaultDirectory,
		&project.UseYearSubfolders,
		&project.RecipientsTo,
		&project.RecipientsCC,
		&project.RecipientsBCC,
		&project.MasterStylesheet,
		&project.IsArchived,
		&project.CreatedAt,
		&project.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project not found: %d", id)
	}
	if err != nil {
		r.logger.Error("failed to get project", zap.Error(err))
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	return project, nil
}

// ListActive retrieves all active (non-archived) projects
func (r *ProjectRepository) ListActive() ([]*models.Project, error) {
	r.logger.Debug("listing active projects")

	query := `
		SELECT id, name, filename_format, report_title_format, default_directory,
			use_year_subfolders, recipients_to, recipients_cc, recipients_bcc,
			master_stylesheet, is_archived, created_at, updated_at
		FROM projects
		WHERE is_archived = 0
		ORDER BY name ASC
	`

	rows, err := r.db.Conn.Query(query)
	if err != nil {
		r.logger.Error("failed to list active projects", zap.Error(err))
		return nil, fmt.Errorf("failed to list active projects: %w", err)
	}
	defer rows.Close()

	projects := []*models.Project{}
	for rows.Next() {
		project := &models.Project{}
		err := rows.Scan(
			&project.ID,
			&project.Name,
			&project.FilenameFormat,
			&project.ReportTitleFormat,
			&project.DefaultDirectory,
			&project.UseYearSubfolders,
			&project.RecipientsTo,
			&project.RecipientsCC,
			&project.RecipientsBCC,
			&project.MasterStylesheet,
			&project.IsArchived,
			&project.CreatedAt,
			&project.UpdatedAt,
		)
		if err != nil {
			r.logger.Error("failed to scan project", zap.Error(err))
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}
		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating projects: %w", err)
	}

	r.logger.Debug("listed active projects",
		zap.Int("count", len(projects)),
	)

	return projects, nil
}

// ListArchived retrieves all archived projects
func (r *ProjectRepository) ListArchived() ([]*models.Project, error) {
	r.logger.Debug("listing archived projects")

	query := `
		SELECT id, name, filename_format, report_title_format, default_directory,
			use_year_subfolders, recipients_to, recipients_cc, recipients_bcc,
			master_stylesheet, is_archived, created_at, updated_at
		FROM projects
		WHERE is_archived = 1
		ORDER BY name ASC
	`

	rows, err := r.db.Conn.Query(query)
	if err != nil {
		r.logger.Error("failed to list archived projects", zap.Error(err))
		return nil, fmt.Errorf("failed to list archived projects: %w", err)
	}
	defer rows.Close()

	projects := []*models.Project{}
	for rows.Next() {
		project := &models.Project{}
		err := rows.Scan(
			&project.ID,
			&project.Name,
			&project.FilenameFormat,
			&project.ReportTitleFormat,
			&project.DefaultDirectory,
			&project.UseYearSubfolders,
			&project.RecipientsTo,
			&project.RecipientsCC,
			&project.RecipientsBCC,
			&project.MasterStylesheet,
			&project.IsArchived,
			&project.CreatedAt,
			&project.UpdatedAt,
		)
		if err != nil {
			r.logger.Error("failed to scan project", zap.Error(err))
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}
		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating projects: %w", err)
	}

	r.logger.Debug("listed archived projects",
		zap.Int("count", len(projects)),
	)

	return projects, nil
}

// Archive marks a project as archived
func (r *ProjectRepository) Archive(id int64) error {
	r.logger.Info("archiving project",
		zap.Int64("id", id),
	)

	query := `
		UPDATE projects SET
			is_archived = 1,
			updated_at = ?
		WHERE id = ?
	`

	result, err := r.db.Conn.Exec(query, time.Now(), id)
	if err != nil {
		r.logger.Error("failed to archive project", zap.Error(err))
		return fmt.Errorf("failed to archive project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project not found: %d", id)
	}

	r.logger.Info("project archived successfully",
		zap.Int64("id", id),
	)

	return nil
}

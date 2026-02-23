package repository

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"go.uber.org/zap"
)

// DB holds the database connection and logger
type DB struct {
	Conn   *sql.DB
	Logger *zap.Logger
}

// InitDB initializes the SQLite database connection
func InitDB(logger *zap.Logger) (*DB, error) {
	var dbPath string

	// Check for test database path environment variable
	if testDBPath := os.Getenv("STATUS_REPORT_DB_PATH"); testDBPath != "" {
		dbPath = testDBPath
		logger.Info("using test database path from environment",
			zap.String("path", dbPath),
		)
	} else {
		// Get user's home directory
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to get home directory: %w", err)
		}

		// Create application data directory
		appDir := filepath.Join(homeDir, ".statli")
		if err := os.MkdirAll(appDir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create app directory: %w", err)
		}

		// Database file path
		dbPath = filepath.Join(appDir, "statli.db")
	}

	logger.Info("initializing database",
		zap.String("path", dbPath),
	)

	// Open database connection
	conn, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pooling
	conn.SetMaxOpenConns(25)                 // Maximum number of open connections
	conn.SetMaxIdleConns(5)                  // Maximum number of idle connections
	conn.SetConnMaxLifetime(5 * time.Minute) // Maximum lifetime of a connection

	// Test connection
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("database connection established with connection pooling",
		zap.Int("max_open_conns", 25),
		zap.Int("max_idle_conns", 5),
	)

	db := &DB{
		Conn:   conn,
		Logger: logger,
	}

	// Initialize schema (will be implemented in task 2)
	if err := db.initSchema(); err != nil {
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return db, nil
}

// initSchema creates the database schema if it doesn't exist
func (db *DB) initSchema() error {
	db.Logger.Info("initializing database schema")

	// Create all tables
	schema := `
	-- Projects table
	CREATE TABLE IF NOT EXISTS projects (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		filename_format TEXT NOT NULL DEFAULT '{project-name}-status-{YYYY-MM-DD}.md',
		report_title_format TEXT NOT NULL DEFAULT '{project-name} Status Report - {YYYY-MM-DD}',
		default_directory TEXT NOT NULL DEFAULT '',
		use_year_subfolders BOOLEAN NOT NULL DEFAULT 0,
		recipients_to TEXT NOT NULL DEFAULT '',
		recipients_cc TEXT NOT NULL DEFAULT '',
		recipients_bcc TEXT NOT NULL DEFAULT '',
		is_archived BOOLEAN NOT NULL DEFAULT 0,
		master_stylesheet TEXT NOT NULL DEFAULT '',
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	-- Report sections table
	CREATE TABLE IF NOT EXISTS report_sections (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		type TEXT NOT NULL CHECK(type IN ('prose', 'status')),
		content TEXT NOT NULL DEFAULT '',
		order_index INTEGER NOT NULL,
		is_enabled BOOLEAN NOT NULL DEFAULT 1,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	-- Status definitions table
	CREATE TABLE IF NOT EXISTS status_definitions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		style TEXT NOT NULL CHECK(style IN ('red', 'green', 'yellow', 'gray', 'paused', 'pending')),
		order_index INTEGER NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	-- Tasks table
	CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		report_section_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		status TEXT NOT NULL,
		expected_completion_date DATE,
		url TEXT NOT NULL DEFAULT '',
		notes TEXT NOT NULL DEFAULT '',
		priority INTEGER NOT NULL DEFAULT 0,
		is_deleted BOOLEAN NOT NULL DEFAULT 0,
		is_archived BOOLEAN NOT NULL DEFAULT 0,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
		FOREIGN KEY (report_section_id) REFERENCES report_sections(id) ON DELETE RESTRICT
	);

	-- Subtasks table
	CREATE TABLE IF NOT EXISTS subtasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		status TEXT NOT NULL,
		expected_completion_date DATE,
		url TEXT NOT NULL DEFAULT '',
		notes TEXT NOT NULL DEFAULT '',
		is_deleted BOOLEAN NOT NULL DEFAULT 0,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
	);

	-- Report snapshots table
	CREATE TABLE IF NOT EXISTS report_snapshots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		markdown_content TEXT NOT NULL,
		finalized_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	-- Task history table (audit trail)
	CREATE TABLE IF NOT EXISTS task_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		report_snapshot_id INTEGER NOT NULL,
		task_id INTEGER NOT NULL,
		subtask_id INTEGER,
		name TEXT NOT NULL,
		status TEXT NOT NULL,
		expected_completion_date DATE,
		url TEXT NOT NULL DEFAULT '',
		notes TEXT NOT NULL DEFAULT '',
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (report_snapshot_id) REFERENCES report_snapshots(id) ON DELETE CASCADE,
		FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
		FOREIGN KEY (subtask_id) REFERENCES subtasks(id) ON DELETE CASCADE
	);

	-- Indexes for performance
	CREATE INDEX IF NOT EXISTS idx_tasks_project_section ON tasks(project_id, report_section_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(is_deleted);
	CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
	CREATE INDEX IF NOT EXISTS idx_subtasks_deleted ON subtasks(is_deleted);
	CREATE INDEX IF NOT EXISTS idx_task_history_snapshot ON task_history(report_snapshot_id);
	CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);
	CREATE INDEX IF NOT EXISTS idx_report_sections_project ON report_sections(project_id);
	CREATE INDEX IF NOT EXISTS idx_status_definitions_project ON status_definitions(project_id);
	`

	// Execute schema creation
	if _, err := db.Conn.Exec(schema); err != nil {
		db.Logger.Error("failed to create schema", zap.Error(err))
		return fmt.Errorf("failed to create schema: %w", err)
	}

	// Run migrations for existing databases
	if err := db.runMigrations(); err != nil {
		db.Logger.Error("failed to run migrations", zap.Error(err))
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	db.Logger.Info("database schema initialized successfully")
	return nil
}

// Close closes the database connection
func (db *DB) Close() error {
	if db.Conn != nil {
		db.Logger.Info("closing database connection")
		return db.Conn.Close()
	}
	return nil
}

// runMigrations applies database migrations for existing databases
func (db *DB) runMigrations() error {
	db.Logger.Info("running database migrations")

	// Migration 1: Add master_stylesheet column to projects table
	if err := db.addColumnIfNotExists("projects", "master_stylesheet", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return fmt.Errorf("failed to add master_stylesheet column: %w", err)
	}

	db.Logger.Info("database migrations completed successfully")
	return nil
}

// addColumnIfNotExists adds a column to a table if it doesn't already exist
func (db *DB) addColumnIfNotExists(tableName, columnName, columnDef string) error {
	// Check if column exists
	query := fmt.Sprintf("PRAGMA table_info(%s)", tableName)
	rows, err := db.Conn.Query(query)
	if err != nil {
		return fmt.Errorf("failed to query table info: %w", err)
	}
	defer rows.Close()

	columnExists := false
	for rows.Next() {
		var cid int
		var name string
		var dataType string
		var notNull int
		var defaultValue sql.NullString
		var pk int

		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk); err != nil {
			return fmt.Errorf("failed to scan table info: %w", err)
		}

		if name == columnName {
			columnExists = true
			break
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("error iterating table info: %w", err)
	}

	// Add column if it doesn't exist
	if !columnExists {
		alterQuery := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, columnDef)
		if _, err := db.Conn.Exec(alterQuery); err != nil {
			return fmt.Errorf("failed to add column: %w", err)
		}
		db.Logger.Info("added column to table",
			zap.String("table", tableName),
			zap.String("column", columnName),
		)
	} else {
		db.Logger.Debug("column already exists",
			zap.String("table", tableName),
			zap.String("column", columnName),
		)
	}

	return nil
}

package repository

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"go.uber.org/zap"
)

// TestInitSchema verifies that the database schema is created correctly
func TestInitSchema(t *testing.T) {
	// Create a temporary directory for the test database
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")

	// Create a test logger
	logger, err := zap.NewDevelopment()
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	defer logger.Sync()

	// Open database connection
	conn, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer conn.Close()

	db := &DB{
		Conn:   conn,
		Logger: logger,
	}

	// Initialize schema
	if err := db.initSchema(); err != nil {
		t.Fatalf("failed to initialize schema: %v", err)
	}

	// Verify all tables exist
	tables := []string{
		"projects",
		"report_sections",
		"status_definitions",
		"tasks",
		"subtasks",
		"report_snapshots",
		"task_history",
	}

	for _, table := range tables {
		var name string
		query := "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
		err := db.Conn.QueryRow(query, table).Scan(&name)
		if err != nil {
			t.Errorf("table %s does not exist: %v", table, err)
		}
	}

	// Verify indexes exist
	indexes := []string{
		"idx_tasks_project_section",
		"idx_tasks_deleted",
		"idx_subtasks_task",
		"idx_subtasks_deleted",
		"idx_task_history_snapshot",
		"idx_task_history_task",
		"idx_report_sections_project",
		"idx_status_definitions_project",
	}

	for _, index := range indexes {
		var name string
		query := "SELECT name FROM sqlite_master WHERE type='index' AND name=?"
		err := db.Conn.QueryRow(query, index).Scan(&name)
		if err != nil {
			t.Errorf("index %s does not exist: %v", index, err)
		}
	}
}

// TestForeignKeyConstraints verifies that foreign key constraints are enforced
func TestForeignKeyConstraints(t *testing.T) {
	// Create a temporary directory for the test database
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")

	// Create a test logger
	logger, err := zap.NewDevelopment()
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	defer logger.Sync()

	// Open database connection with foreign keys enabled
	conn, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer conn.Close()

	db := &DB{
		Conn:   conn,
		Logger: logger,
	}

	// Initialize schema
	if err := db.initSchema(); err != nil {
		t.Fatalf("failed to initialize schema: %v", err)
	}

	// Test 1: Try to insert a task with non-existent project_id (should fail)
	_, err = db.Conn.Exec(`
		INSERT INTO tasks (project_id, report_section_id, name, status)
		VALUES (999, 1, 'Test Task', 'not started')
	`)
	if err == nil {
		t.Error("expected foreign key constraint violation for non-existent project_id, but insert succeeded")
	}

	// Test 2: Create a project, then create a task referencing it (should succeed)
	result, err := db.Conn.Exec(`
		INSERT INTO projects (name) VALUES ('Test Project')
	`)
	if err != nil {
		t.Fatalf("failed to insert project: %v", err)
	}
	projectID, _ := result.LastInsertId()

	// Create a report section for the task
	result, err = db.Conn.Exec(`
		INSERT INTO report_sections (project_id, name, type, order_index)
		VALUES (?, 'Test Section', 'status', 1)
	`, projectID)
	if err != nil {
		t.Fatalf("failed to insert report section: %v", err)
	}
	sectionID, _ := result.LastInsertId()

	// Now create the task
	_, err = db.Conn.Exec(`
		INSERT INTO tasks (project_id, report_section_id, name, status)
		VALUES (?, ?, 'Test Task', 'not started')
	`, projectID, sectionID)
	if err != nil {
		t.Errorf("failed to insert task with valid foreign keys: %v", err)
	}

	// Test 3: Verify CASCADE delete works
	_, err = db.Conn.Exec(`DELETE FROM projects WHERE id = ?`, projectID)
	if err != nil {
		t.Errorf("failed to delete project: %v", err)
	}

	// Verify tasks were also deleted (CASCADE)
	var count int
	err = db.Conn.QueryRow(`SELECT COUNT(*) FROM tasks WHERE project_id = ?`, projectID).Scan(&count)
	if err != nil {
		t.Errorf("failed to count tasks: %v", err)
	}
	if count != 0 {
		t.Errorf("expected 0 tasks after project deletion, got %d", count)
	}
}

// TestSchemaIdempotency verifies that running initSchema multiple times is safe
func TestSchemaIdempotency(t *testing.T) {
	// Create a temporary directory for the test database
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")

	// Create a test logger
	logger, err := zap.NewDevelopment()
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	defer logger.Sync()

	// Open database connection
	conn, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer conn.Close()

	db := &DB{
		Conn:   conn,
		Logger: logger,
	}

	// Initialize schema first time
	if err := db.initSchema(); err != nil {
		t.Fatalf("failed to initialize schema first time: %v", err)
	}

	// Initialize schema second time (should not error)
	if err := db.initSchema(); err != nil {
		t.Fatalf("failed to initialize schema second time: %v", err)
	}

	// Verify tables still exist
	var name string
	query := "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'"
	err = db.Conn.QueryRow(query).Scan(&name)
	if err != nil {
		t.Errorf("projects table does not exist after second init: %v", err)
	}
}

// TestInitDB verifies the full database initialization process
func TestInitDB(t *testing.T) {
	// Create a temporary directory for the test
	tempDir := t.TempDir()

	// Override the home directory for this test
	originalHome := os.Getenv("HOME")
	os.Setenv("HOME", tempDir)
	defer os.Setenv("HOME", originalHome)

	// Create a test logger
	logger, err := zap.NewDevelopment()
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	defer logger.Sync()

	// Initialize database
	db, err := InitDB(logger)
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer db.Close()

	// Verify database file was created
	dbPath := filepath.Join(tempDir, ".statli", "statli.db")
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		t.Errorf("database file was not created at %s", dbPath)
	}

	// Verify we can query the database
	var count int
	err = db.Conn.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").Scan(&count)
	if err != nil {
		t.Errorf("failed to query database: %v", err)
	}
	if count < 7 {
		t.Errorf("expected at least 7 tables, got %d", count)
	}
}

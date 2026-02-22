package repository

import (
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	_ "github.com/mattn/go-sqlite3"
	"go.uber.org/zap"
)

// TestProperty21_ReferentialIntegrityOnFinalization tests that all Task_History entries
// have valid foreign key references after report finalization
// **Validates: Requirements 8.13**
func TestProperty21_ReferentialIntegrityOnFinalization(t *testing.T) {
	properties := gopter.NewProperties(nil)

	properties.Property("Feature: status-report-manager, Property 21: Referential Integrity on Finalization",
		prop.ForAll(
			func(numTasks, numSubtasksPerTask int) bool {
				// Create a temporary test database
				tempDir := t.TempDir()
				dbPath := filepath.Join(tempDir, "test.db")

				logger, err := zap.NewDevelopment()
				if err != nil {
					t.Logf("failed to create logger: %v", err)
					return false
				}
				defer logger.Sync()

				conn, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
				if err != nil {
					t.Logf("failed to open database: %v", err)
					return false
				}
				defer conn.Close()

				db := &DB{
					Conn:   conn,
					Logger: logger,
				}

				if err := db.initSchema(); err != nil {
					t.Logf("failed to initialize schema: %v", err)
					return false
				}

				// Create a project
				result, err := db.Conn.Exec(`
					INSERT INTO projects (name) VALUES ('Test Project')
				`)
				if err != nil {
					t.Logf("failed to insert project: %v", err)
					return false
				}
				projectID, _ := result.LastInsertId()

				// Create a report section
				result, err = db.Conn.Exec(`
					INSERT INTO report_sections (project_id, name, type, order_index)
					VALUES (?, 'Test Section', 'status', 1)
				`, projectID)
				if err != nil {
					t.Logf("failed to insert report section: %v", err)
					return false
				}
				sectionID, _ := result.LastInsertId()

				// Create tasks
				taskIDs := make([]int64, numTasks)
				for i := 0; i < numTasks; i++ {
					result, err := db.Conn.Exec(`
						INSERT INTO tasks (project_id, report_section_id, name, status)
						VALUES (?, ?, ?, 'in progress')
					`, projectID, sectionID, "Task "+string(rune('A'+i)))
					if err != nil {
						t.Logf("failed to insert task: %v", err)
						return false
					}
					taskIDs[i], _ = result.LastInsertId()
				}

				// Create subtasks for each task
				subtaskIDs := make([]int64, 0)
				for _, taskID := range taskIDs {
					for j := 0; j < numSubtasksPerTask; j++ {
						result, err := db.Conn.Exec(`
							INSERT INTO subtasks (task_id, name, status)
							VALUES (?, ?, 'not started')
						`, taskID, "Subtask "+string(rune('1'+j)))
						if err != nil {
							t.Logf("failed to insert subtask: %v", err)
							return false
						}
						subtaskID, _ := result.LastInsertId()
						subtaskIDs = append(subtaskIDs, subtaskID)
					}
				}

				// Simulate report finalization: create report snapshot
				result, err = db.Conn.Exec(`
					INSERT INTO report_snapshots (project_id, markdown_content, finalized_at)
					VALUES (?, 'Test Report Content', ?)
				`, projectID, time.Now())
				if err != nil {
					t.Logf("failed to insert report snapshot: %v", err)
					return false
				}
				snapshotID, _ := result.LastInsertId()

				// Create task history entries for all tasks
				for _, taskID := range taskIDs {
					_, err := db.Conn.Exec(`
						INSERT INTO task_history (report_snapshot_id, task_id, subtask_id, name, status)
						VALUES (?, ?, NULL, 'Task History', 'in progress')
					`, snapshotID, taskID)
					if err != nil {
						t.Logf("failed to insert task history: %v", err)
						return false
					}
				}

				// Create task history entries for all subtasks
				for i, subtaskID := range subtaskIDs {
					taskID := taskIDs[i/numSubtasksPerTask]
					_, err := db.Conn.Exec(`
						INSERT INTO task_history (report_snapshot_id, task_id, subtask_id, name, status)
						VALUES (?, ?, ?, 'Subtask History', 'not started')
					`, snapshotID, taskID, subtaskID)
					if err != nil {
						t.Logf("failed to insert subtask history: %v", err)
						return false
					}
				}

				// Property: Verify all Task_History entries have valid foreign key references

				// 1. Check that all task_history entries reference an existing report_snapshot
				var invalidSnapshotCount int
				err = db.Conn.QueryRow(`
					SELECT COUNT(*)
					FROM task_history th
					LEFT JOIN report_snapshots rs ON th.report_snapshot_id = rs.id
					WHERE rs.id IS NULL
				`).Scan(&invalidSnapshotCount)
				if err != nil {
					t.Logf("failed to check snapshot references: %v", err)
					return false
				}
				if invalidSnapshotCount > 0 {
					t.Logf("found %d task_history entries with invalid report_snapshot_id", invalidSnapshotCount)
					return false
				}

				// 2. Check that all task_history entries reference an existing task
				var invalidTaskCount int
				err = db.Conn.QueryRow(`
					SELECT COUNT(*)
					FROM task_history th
					LEFT JOIN tasks t ON th.task_id = t.id
					WHERE t.id IS NULL
				`).Scan(&invalidTaskCount)
				if err != nil {
					t.Logf("failed to check task references: %v", err)
					return false
				}
				if invalidTaskCount > 0 {
					t.Logf("found %d task_history entries with invalid task_id", invalidTaskCount)
					return false
				}

				// 3. Check that all task_history entries with non-NULL subtask_id reference an existing subtask
				var invalidSubtaskCount int
				err = db.Conn.QueryRow(`
					SELECT COUNT(*)
					FROM task_history th
					LEFT JOIN subtasks s ON th.subtask_id = s.id
					WHERE th.subtask_id IS NOT NULL AND s.id IS NULL
				`).Scan(&invalidSubtaskCount)
				if err != nil {
					t.Logf("failed to check subtask references: %v", err)
					return false
				}
				if invalidSubtaskCount > 0 {
					t.Logf("found %d task_history entries with invalid subtask_id", invalidSubtaskCount)
					return false
				}

				// All checks passed
				return true
			},
			gen.IntRange(1, 10), // numTasks: 1-10 tasks
			gen.IntRange(0, 5),  // numSubtasksPerTask: 0-5 subtasks per task
		))

	properties.TestingRun(t, gopter.ConsoleReporter(false))
}

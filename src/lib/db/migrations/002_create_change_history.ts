import type Database from "better-sqlite3";

export function up(db: Database.Database): void {
	db.exec(`
		CREATE TABLE change_history (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			field_changed TEXT NOT NULL,
			old_value TEXT,
			new_value TEXT,
			changed_by TEXT NOT NULL CHECK (changed_by IN ('system','user','agent')),
			reason TEXT,
			created_at TEXT NOT NULL
		);

		CREATE INDEX idx_history_project ON change_history(project_id);
		CREATE INDEX idx_history_created ON change_history(created_at);
	`);
}

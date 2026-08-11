import type Database from "better-sqlite3";

export function up(db: Database.Database): void {
	db.exec(`
		CREATE TABLE review_items (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			type TEXT NOT NULL CHECK (type IN ('release_model','status_change','ambiguous_signal')),
			reason TEXT NOT NULL,
			resolved INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			resolved_at TEXT
		);

		CREATE INDEX idx_reviews_project ON review_items(project_id);
		CREATE INDEX idx_reviews_unresolved ON review_items(project_id) WHERE resolved = 0;
	`);
}

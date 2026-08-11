import type Database from "better-sqlite3";

export function up(db: Database.Database): void {
	db.exec(`
		CREATE TABLE projects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			category TEXT NOT NULL CHECK (category IN ('integration','valkey_module','valkey_glide','valkey_docs_demos','infrastructure')),
			status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','merged','completed','dropped')),
			release_model TEXT NOT NULL CHECK (release_model IN ('github_release','merge_is_complete','pypi','npm','nuget','manual')),
			release_model_confident INTEGER NOT NULL DEFAULT 0,
			locked INTEGER NOT NULL DEFAULT 0,
			pr_urls TEXT NOT NULL DEFAULT '[]',
			issue_urls TEXT NOT NULL DEFAULT '[]',
			release_url TEXT,
			drop_reason TEXT,
			notes TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			deleted_at TEXT
		);

		CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
		CREATE INDEX idx_projects_category ON projects(category) WHERE deleted_at IS NULL;
	`);
}

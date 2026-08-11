import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { up as createProjects } from "./migrations/001_create_projects.js";
import { up as createChangeHistory } from "./migrations/002_create_change_history.js";
import { up as createReviewItems } from "./migrations/003_create_review_items.js";

const migrations = [
	{ name: "001_create_projects", up: createProjects },
	{ name: "002_create_change_history", up: createChangeHistory },
	{ name: "003_create_review_items", up: createReviewItems },
];

export function createDatabase(dbPath?: string): Database.Database {
	const resolvedPath = dbPath ?? process.env.DATABASE_URL ?? "./data/statli.db";

	if (resolvedPath !== ":memory:") {
		const dir = path.dirname(resolvedPath);
		fs.mkdirSync(dir, { recursive: true });
	}

	const db = new Database(resolvedPath);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	runMigrations(db);
	return db;
}

export function runMigrations(db: Database.Database): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS _migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			applied_at TEXT NOT NULL
		)
	`);

	const applied = new Set(
		db
			.prepare("SELECT name FROM _migrations")
			.all()
			.map((row) => (row as { name: string }).name),
	);

	const pending = migrations.filter((m) => !applied.has(m.name));

	if (pending.length === 0) return;

	const applyAll = db.transaction(() => {
		for (const migration of pending) {
			migration.up(db);
			db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(
				migration.name,
				new Date().toISOString(),
			);
		}
	});

	applyAll();
}

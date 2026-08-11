import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, runMigrations } from "../../../src/lib/db/index.js";

describe("migrations", () => {
	let db: Database.Database;

	beforeEach(() => {
		db = createDatabase(":memory:");
	});

	afterEach(() => {
		db.close();
	});

	it("creates database successfully with in-memory path", () => {
		expect(db).toBeDefined();
		expect(db.open).toBe(true);
	});

	it("creates all expected tables", () => {
		const tables = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
			)
			.all()
			.map((row) => (row as { name: string }).name);

		expect(tables).toContain("_migrations");
		expect(tables).toContain("projects");
		expect(tables).toContain("change_history");
		expect(tables).toContain("review_items");
	});

	it("running migrations twice is idempotent", () => {
		expect(() => runMigrations(db)).not.toThrow();
	});

	it("records applied migrations in _migrations table", () => {
		const applied = db
			.prepare("SELECT name FROM _migrations ORDER BY id")
			.all()
			.map((row) => (row as { name: string }).name);

		expect(applied).toEqual([
			"001_create_projects",
			"002_create_change_history",
			"003_create_review_items",
		]);
	});
});

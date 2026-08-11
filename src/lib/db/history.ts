import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ChangedBy } from "../schemas/common.js";

export interface ChangeHistoryEntry {
	id: string;
	project_id: string;
	field_changed: string;
	old_value: string | null;
	new_value: string | null;
	changed_by: string;
	reason: string | null;
	created_at: string;
}

export function recordChange(
	db: Database.Database,
	projectId: string,
	field: string,
	oldValue: string | null,
	newValue: string | null,
	changedBy: ChangedBy,
	reason?: string,
): void {
	const id = uuidv4();
	const now = new Date().toISOString();

	db.prepare(
		`INSERT INTO change_history (id, project_id, field_changed, old_value, new_value, changed_by, reason, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(id, projectId, field, oldValue, newValue, changedBy, reason ?? null, now);
}

export function getChangeHistory(
	db: Database.Database,
	projectId?: string,
	since?: string,
): ChangeHistoryEntry[] {
	let query = "SELECT * FROM change_history WHERE 1=1";
	const params: unknown[] = [];

	if (projectId) {
		query += " AND project_id = ?";
		params.push(projectId);
	}

	if (since) {
		query += " AND created_at >= ?";
		params.push(since);
	}

	query += " ORDER BY created_at DESC";

	return db.prepare(query).all(...params) as ChangeHistoryEntry[];
}

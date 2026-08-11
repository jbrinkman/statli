import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { reviewTypeEnum } from "../schemas/common.js";
import type { ReviewItem } from "../schemas/review.js";

export function addReviewItem(
	db: Database.Database,
	projectId: string,
	type: string,
	reason: string,
): ReviewItem {
	const parsed = reviewTypeEnum.parse(type);
	const id = uuidv4();
	const now = new Date().toISOString();

	db.prepare(
		`INSERT INTO review_items (id, project_id, type, reason, created_at)
		 VALUES (?, ?, ?, ?, ?)`,
	).run(id, projectId, parsed, reason, now);

	return {
		id,
		project_id: projectId,
		type: parsed,
		reason,
		resolved: false,
		created_at: now,
		resolved_at: null,
	};
}

export function resolveReviewItem(db: Database.Database, id: string): ReviewItem | null {
	const row = db.prepare("SELECT * FROM review_items WHERE id = ?").get(id) as
		| Record<string, unknown>
		| undefined;

	if (!row) return null;

	const now = new Date().toISOString();
	db.prepare("UPDATE review_items SET resolved = 1, resolved_at = ? WHERE id = ?").run(now, id);

	return {
		id: row.id as string,
		project_id: row.project_id as string,
		type: row.type as string,
		reason: row.reason as string,
		resolved: true,
		created_at: row.created_at as string,
		resolved_at: now,
	};
}

export function getReviewItems(
	db: Database.Database,
	projectId?: string,
	filters?: { resolved?: boolean; type?: string },
): ReviewItem[] {
	let query = "SELECT * FROM review_items WHERE 1=1";
	const params: unknown[] = [];

	if (projectId) {
		query += " AND project_id = ?";
		params.push(projectId);
	}

	if (filters?.resolved !== undefined) {
		query += " AND resolved = ?";
		params.push(filters.resolved ? 1 : 0);
	}

	if (filters?.type) {
		query += " AND type = ?";
		params.push(filters.type);
	}

	query += " ORDER BY created_at DESC";

	const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>;
	return rows.map((row) => ({
		id: row.id as string,
		project_id: row.project_id as string,
		type: row.type as string,
		reason: row.reason as string,
		resolved: (row.resolved as number) === 1,
		created_at: row.created_at as string,
		resolved_at: row.resolved_at as string | null,
	}));
}

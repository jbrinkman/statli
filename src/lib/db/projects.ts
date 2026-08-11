import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ChangedBy } from "../schemas/common.js";
import {
	type CreateProjectInput,
	createProjectSchema,
	type ListProjectsFilter,
	type Project,
	type UpdateProjectInput,
	updateProjectSchema,
} from "../schemas/project.js";
import { recordChange } from "./history.js";

export class ConflictError extends Error {
	code = "CONFLICT";
	status = 409;
	constructor(message: string) {
		super(message);
		this.name = "ConflictError";
	}
}

function rowToProject(row: Record<string, unknown>, needsReview = false): Project {
	return {
		id: row.id as string,
		name: row.name as string,
		category: row.category as string,
		status: row.status as string,
		release_model: row.release_model as string,
		release_model_confident: (row.release_model_confident as number) === 1,
		locked: (row.locked as number) === 1,
		pr_urls: JSON.parse(row.pr_urls as string),
		issue_urls: JSON.parse(row.issue_urls as string),
		release_url: row.release_url as string | null,
		drop_reason: row.drop_reason as string | null,
		notes: row.notes as string | null,
		needs_review: needsReview,
		created_at: row.created_at as string,
		updated_at: row.updated_at as string,
		deleted_at: row.deleted_at as string | null,
	};
}

export function createProject(db: Database.Database, data: CreateProjectInput): Project {
	const validated = createProjectSchema.parse(data);
	const id = uuidv4();
	const now = new Date().toISOString();

	db.prepare(
		`INSERT INTO projects (id, name, category, status, release_model, release_model_confident, pr_urls, issue_urls, release_url, drop_reason, notes, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		id,
		validated.name,
		validated.category,
		validated.status,
		validated.release_model,
		validated.release_model_confident ? 1 : 0,
		JSON.stringify(validated.pr_urls),
		JSON.stringify(validated.issue_urls),
		validated.release_url,
		validated.drop_reason,
		validated.notes,
		now,
		now,
	);

	return getProject(db, id) as Project;
}

export function getProject(db: Database.Database, id: string): Project | null {
	const row = db.prepare("SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL").get(id) as
		| Record<string, unknown>
		| undefined;

	if (!row) return null;

	const hasUnresolved =
		(
			db
				.prepare("SELECT COUNT(*) as cnt FROM review_items WHERE project_id = ? AND resolved = 0")
				.get(id) as { cnt: number }
		).cnt > 0;

	return rowToProject(row, hasUnresolved);
}

export function listProjects(db: Database.Database, filters?: ListProjectsFilter): Project[] {
	let query = `
		SELECT p.*, 
			CASE WHEN EXISTS (SELECT 1 FROM review_items ri WHERE ri.project_id = p.id AND ri.resolved = 0) THEN 1 ELSE 0 END as has_review
		FROM projects p
		WHERE p.deleted_at IS NULL
	`;
	const params: unknown[] = [];

	if (filters?.status) {
		query += " AND p.status = ?";
		params.push(filters.status);
	}
	if (filters?.category) {
		query += " AND p.category = ?";
		params.push(filters.category);
	}
	if (filters?.name) {
		query += " AND LOWER(p.name) = LOWER(?)";
		params.push(filters.name);
	}

	query += " ORDER BY p.updated_at DESC";

	const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>;
	let projects = rows.map((row) => rowToProject(row, (row.has_review as number) === 1));

	if (filters?.needs_review !== undefined) {
		projects = projects.filter((p) => p.needs_review === filters.needs_review);
	}

	return projects;
}

export function updateProject(
	db: Database.Database,
	id: string,
	data: UpdateProjectInput,
	changedBy: ChangedBy = "user",
): Project | null {
	const validated = updateProjectSchema.parse(data);
	const { force, ...fields } = validated;

	const txn = db.transaction(() => {
		const existing = db
			.prepare("SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL")
			.get(id) as Record<string, unknown> | undefined;

		if (!existing) return null;

		if ((existing.locked as number) === 1 && "status" in fields && !force) {
			throw new ConflictError("Project is locked. Use force:true to override status changes.");
		}

		const now = new Date().toISOString();
		const updates: string[] = ["updated_at = ?"];
		const updateParams: unknown[] = [now];

		const trackedFields = [
			"name",
			"category",
			"status",
			"release_model",
			"release_model_confident",
			"pr_urls",
			"issue_urls",
			"release_url",
			"drop_reason",
			"notes",
		] as const;

		for (const field of trackedFields) {
			if (field in fields) {
				const newValue = fields[field as keyof typeof fields];
				let dbNewValue: unknown;
				let oldValueStr: string | null;
				let newValueStr: string | null;

				if (field === "release_model_confident") {
					dbNewValue = newValue ? 1 : 0;
					oldValueStr = String((existing.release_model_confident as number) === 1);
					newValueStr = String(newValue);
				} else if (field === "pr_urls" || field === "issue_urls") {
					dbNewValue = JSON.stringify(newValue);
					oldValueStr = existing[field] as string;
					newValueStr = JSON.stringify(newValue);
				} else {
					dbNewValue = newValue;
					oldValueStr = existing[field] as string | null;
					newValueStr = newValue as string | null;
				}

				if (oldValueStr !== newValueStr) {
					updates.push(`${field} = ?`);
					updateParams.push(dbNewValue);
					recordChange(db, id, field, oldValueStr, newValueStr, changedBy);
				}
			}
		}

		updateParams.push(id);
		db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...updateParams);

		return getProject(db, id);
	});

	return txn();
}

export function deleteProject(db: Database.Database, id: string): boolean {
	const existing = db
		.prepare("SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL")
		.get(id);

	if (!existing) return false;

	const now = new Date().toISOString();
	db.prepare("UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);
	recordChange(db, id, "deleted_at", null, now, "user");
	return true;
}

export function lockProject(
	db: Database.Database,
	id: string,
	changedBy: ChangedBy = "user",
): Project | null {
	const existing = db
		.prepare("SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL")
		.get(id);

	if (!existing) return null;

	const now = new Date().toISOString();
	db.prepare("UPDATE projects SET locked = 1, updated_at = ? WHERE id = ?").run(now, id);
	recordChange(db, id, "locked", "false", "true", changedBy);
	return getProject(db, id);
}

export function unlockProject(
	db: Database.Database,
	id: string,
	changedBy: ChangedBy = "user",
): Project | null {
	const existing = db
		.prepare("SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL")
		.get(id);

	if (!existing) return null;

	const now = new Date().toISOString();
	db.prepare("UPDATE projects SET locked = 0, updated_at = ? WHERE id = ?").run(now, id);
	recordChange(db, id, "locked", "true", "false", changedBy);
	return getProject(db, id);
}

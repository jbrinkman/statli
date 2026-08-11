import { createDatabase } from "./db/index.js";

let db: ReturnType<typeof createDatabase> | null = null;

export function getDb() {
	if (!db) {
		db = createDatabase();
	}
	return db;
}

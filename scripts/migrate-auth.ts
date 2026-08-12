import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
	for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx);
		const value = trimmed.slice(eqIdx + 1);
		if (!process.env[key]) process.env[key] = value;
	}
}

const dbPath = process.env.DATABASE_URL || "./data/statli.db";
const authSecret = process.env.AUTH_SECRET;

if (!authSecret || authSecret.length < 32) {
	console.error("AUTH_SECRET must be set and at least 32 characters");
	process.exit(1);
}

const db = new Database(dbPath);
const auth = betterAuth({
	database: db,
	secret: authSecret,
	emailAndPassword: { enabled: true },
});

console.log("Running Better Auth migrations...");
const { runMigrations } = await getMigrations({
	...auth.options,
	database: db,
});
await runMigrations();
console.log("Better Auth migrations complete.");
db.close();

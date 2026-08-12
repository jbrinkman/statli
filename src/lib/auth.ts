import fs from "node:fs";
import path from "node:path";
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

// Load .env manually if process.env doesn't have our vars
// (Astro/Vite doesn't always populate process.env in SSR)
function loadEnvFile() {
	if (process.env.AUTH_SECRET) return;
	const envPath = path.resolve(process.cwd(), ".env");
	if (!fs.existsSync(envPath)) return;
	const content = fs.readFileSync(envPath, "utf-8");
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx);
		const value = trimmed.slice(eqIdx + 1);
		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
}

loadEnvFile();

let authInstance: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
	if (authInstance) return authInstance;

	const authSecret = process.env.AUTH_SECRET;
	if (!authSecret || authSecret.length < 32) {
		throw new Error("AUTH_SECRET must be set and at least 32 characters");
	}

	const dbPath = process.env.DATABASE_URL || "./data/statli.db";

	authInstance = betterAuth({
		database: new Database(dbPath),
		secret: authSecret,
		emailAndPassword: { enabled: true },
	});

	return authInstance;
}

// For backward compatibility and direct import
export const auth = {
	get api() {
		return getAuth().api;
	},
	handler(request: Request) {
		return getAuth().handler(request);
	},
};

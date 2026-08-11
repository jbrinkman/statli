import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

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

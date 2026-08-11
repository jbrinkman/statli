import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

const authSecret = process.env.AUTH_SECRET;
if (!authSecret || authSecret.length < 32) {
	throw new Error("AUTH_SECRET must be set and at least 32 characters");
}

const dbPath = process.env.DATABASE_URL || "./data/statli.db";

export const auth = betterAuth({
	database: new Database(dbPath),
	secret: authSecret,
	emailAndPassword: { enabled: true },
});

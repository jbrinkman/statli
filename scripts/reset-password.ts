import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { hashPassword } from "better-auth/crypto";

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

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
	console.error("Usage: npx tsx scripts/reset-password.ts <email> <new-password>");
	process.exit(1);
}

if (newPassword.length < 8) {
	console.error("Password must be at least 8 characters");
	process.exit(1);
}

const dbPath = process.env.DATABASE_URL || "./data/statli.db";
const db = new Database(dbPath);

const user = db.prepare("SELECT id FROM user WHERE email = ?").get(email) as
	| { id: string }
	| undefined;

if (!user) {
	console.error(`No user found with email: ${email}`);
	db.close();
	process.exit(1);
}

const hashed = await hashPassword(newPassword);
db.prepare("UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'").run(
	hashed,
	user.id,
);
db.prepare("DELETE FROM session WHERE userId = ?").run(user.id);

console.log(`Password reset successfully for ${email}`);
db.close();

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";

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
const auth = betterAuth({
	database: db,
	secret: process.env.AUTH_SECRET || "",
	emailAndPassword: { enabled: true },
	basePath: "/api/auth",
});

// Check user exists
const user = db.prepare("SELECT id, email FROM user WHERE email = ?").get(email) as
	| { id: string; email: string }
	| undefined;

if (!user) {
	console.error(`No user found with email: ${email}`);
	db.close();
	process.exit(1);
}

// Delete existing credential account entry, then sign up fresh (preserves user ID)
db.prepare("DELETE FROM account WHERE userId = ? AND providerId = 'credential'").run(user.id);
db.prepare("DELETE FROM session WHERE userId = ?").run(user.id);
db.prepare("DELETE FROM user WHERE id = ?").run(user.id);

// Re-register through Better Auth API (creates new user with same email)
const response = await auth.handler(
	new Request("http://localhost/api/auth/sign-up/email", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password: newPassword, name: email.split("@")[0] }),
	}),
);

if (response.ok) {
	console.log(`Password reset successfully for ${email}`);
	console.log("You can now log in with your new password.");
} else {
	const body = await response.json().catch(() => ({}));
	console.error("Failed to reset password:", JSON.stringify(body));
}

db.close();

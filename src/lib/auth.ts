import fs from "node:fs";
import path from "node:path";
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

import { Resend } from "resend";

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
	const db = new Database(dbPath);

	// Ensure Better Auth tables exist
	db.exec(`
		CREATE TABLE IF NOT EXISTS user (
			id TEXT PRIMARY KEY,
			name TEXT,
			email TEXT NOT NULL UNIQUE,
			emailVerified INTEGER NOT NULL DEFAULT 0,
			image TEXT,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS session (
			id TEXT PRIMARY KEY,
			expiresAt TEXT NOT NULL,
			token TEXT NOT NULL UNIQUE,
			ipAddress TEXT,
			userAgent TEXT,
			userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS account (
			id TEXT PRIMARY KEY,
			accountId TEXT NOT NULL,
			providerId TEXT NOT NULL,
			userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			accessToken TEXT,
			refreshToken TEXT,
			idToken TEXT,
			accessTokenExpiresAt TEXT,
			refreshTokenExpiresAt TEXT,
			scope TEXT,
			password TEXT,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS verification (
			id TEXT PRIMARY KEY,
			identifier TEXT NOT NULL,
			value TEXT NOT NULL,
			expiresAt TEXT NOT NULL,
			createdAt TEXT,
			updatedAt TEXT
		);
	`);

	authInstance = betterAuth({
		database: db,
		secret: authSecret,
		emailAndPassword: {
			enabled: true,
			sendResetPassword: ({ user, url }) => {
				const resend = new Resend(process.env.RESEND_API_KEY);
				void resend.emails.send({
					from: process.env.RESEND_FROM_EMAIL || "noreply@localhost",
					to: user.email,
					subject: "Reset your Statli password",
					html: `<p>Click <a href="${url}">here</a> to reset your password.</p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
				});
			},
		},
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

import type { APIRoute } from "astro";
import Database from "better-sqlite3";
import { auth } from "../../../lib/auth.js";

export const POST: APIRoute = async ({ request }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return new Response(
				JSON.stringify({ error: { message: "Email and password are required" } }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		if (password.length < 8) {
			return new Response(
				JSON.stringify({ error: { message: "Password must be at least 8 characters" } }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Get the database from the auth instance to check user exists
		const dbPath = process.env.DATABASE_URL || "./data/statli.db";
		const db = new Database(dbPath);

		const user = db.prepare("SELECT id, email FROM user WHERE email = ?").get(email) as
			| { id: string; email: string }
			| undefined;

		if (!user) {
			db.close();
			return new Response(
				JSON.stringify({ error: { message: "No account found with that email" } }),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		// Delete existing credential and sessions, then re-register
		db.prepare("DELETE FROM account WHERE userId = ? AND providerId = 'credential'").run(user.id);
		db.prepare("DELETE FROM session WHERE userId = ?").run(user.id);
		db.prepare("DELETE FROM user WHERE id = ?").run(user.id);
		db.close();

		// Re-register through Better Auth (creates fresh user with hashed password)
		const response = await auth.handler(
			new Request("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, name: email.split("@")[0] }),
			}),
		);

		if (response.ok) {
			return new Response(JSON.stringify({ data: { message: "Password reset successfully" } }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body = await response.json().catch(() => ({}));
		return new Response(
			JSON.stringify({ error: { message: "Failed to reset password", details: body } }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		return new Response(JSON.stringify({ error: { message: (error as Error).message } }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

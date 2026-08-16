import type { APIRoute } from "astro";
import { hashPassword } from "better-auth/crypto";
import Database from "better-sqlite3";

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

		const dbPath = process.env.DATABASE_URL || "./data/statli.db";
		const db = new Database(dbPath);

		const user = db.prepare("SELECT id FROM user WHERE email = ?").get(email) as
			| { id: string }
			| undefined;

		if (!user) {
			db.close();
			return new Response(
				JSON.stringify({ error: { message: "No account found with that email" } }),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		// Hash the new password using Better Auth's own hashing
		const hashedPassword = await hashPassword(password);

		// Update the credential account's password in place (preserves user ID)
		const result = db
			.prepare("UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'")
			.run(hashedPassword, user.id);

		// Clear existing sessions so user must log in with new password
		db.prepare("DELETE FROM session WHERE userId = ?").run(user.id);

		db.close();

		if (result.changes === 0) {
			return new Response(
				JSON.stringify({ error: { message: "No credential account found for this user" } }),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		return new Response(JSON.stringify({ data: { message: "Password reset successfully" } }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: { message: (error as Error).message } }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

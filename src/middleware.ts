import { defineMiddleware } from "astro:middleware";
import { auth } from "./lib/auth.js";

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;

	// Skip auth for non-API routes and auth routes themselves
	if (!pathname.startsWith("/api/") || pathname.startsWith("/api/auth/")) {
		return next();
	}

	const authHeader = context.request.headers.get("Authorization");

	// Check API key first
	const apiKey = process.env.STATLI_API_KEY;
	if (apiKey && authHeader === `Bearer ${apiKey}`) {
		context.locals.user = { id: "api-key", type: "machine" };
		return next();
	}

	// Check Better Auth session
	try {
		const session = await auth.api.getSession({
			headers: context.request.headers,
		});

		if (session?.user) {
			context.locals.user = { id: session.user.id, type: "human" };
			return next();
		}
	} catch {
		// Auth not configured — reject
	}

	// No valid auth
	return new Response(
		JSON.stringify({
			error: { message: "Unauthorized", code: "UNAUTHORIZED" },
		}),
		{
			status: 401,
			headers: { "Content-Type": "application/json" },
		},
	);
});

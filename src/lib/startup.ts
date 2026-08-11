export function validateEnvironment(): void {
	const authSecret = process.env.AUTH_SECRET;
	if (!authSecret) {
		throw new Error("AUTH_SECRET environment variable is required");
	}
	if (authSecret.length < 32) {
		throw new Error("AUTH_SECRET must be at least 32 characters");
	}

	if (!process.env.STATLI_API_KEY) {
		console.warn("STATLI_API_KEY not set — API key authentication disabled");
	}
}

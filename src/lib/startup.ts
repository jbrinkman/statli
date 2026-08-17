export function validateEnvironment(): void {
	const authSecret = process.env.AUTH_SECRET;
	if (!authSecret) {
		throw new Error("AUTH_SECRET environment variable is required");
	}
	if (authSecret.length < 32) {
		throw new Error("AUTH_SECRET must be at least 32 characters");
	}

	if (!process.env.RESEND_API_KEY) {
		throw new Error("RESEND_API_KEY environment variable is required");
	}
	if (!process.env.RESEND_FROM_EMAIL) {
		throw new Error("RESEND_FROM_EMAIL environment variable is required");
	}

	if (!process.env.STATLI_API_KEY) {
		console.warn("STATLI_API_KEY not set: API key authentication disabled");
	}
}

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
		coverage: {
			provider: "v8",
			include: [
				"src/lib/db/**/*.ts",
				"src/lib/schemas/**/*.ts",
				"src/lib/errors.ts",
				"src/lib/api-utils.ts",
				"src/lib/startup.ts",
				"src/lib/auth.ts",
				"src/lib/api-client.ts",
			],
			exclude: ["src/lib/db/connection.ts"],
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
	},
});

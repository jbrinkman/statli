import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { StatliClient } from "./client.js";
import { getHistoryToolDefinitions } from "./tools/history.js";
import { getProjectToolDefinitions } from "./tools/projects.js";
import { getReportToolDefinitions } from "./tools/reports.js";
import { getReviewToolDefinitions } from "./tools/reviews.js";

const apiUrl = process.env.STATLI_API_URL || "http://127.0.0.1:4321";
const apiKey = process.env.STATLI_API_KEY;

if (!apiKey) {
	console.error("STATLI_API_KEY environment variable is required");
	process.exit(1);
}

const client = new StatliClient(apiUrl, apiKey);

try {
	await client.healthCheck();
} catch (error) {
	console.error("Failed to connect to Statli API:", (error as Error).message);
	process.exit(1);
}

const server = new Server({ name: "statli", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
			...getProjectToolDefinitions(),
			...getReviewToolDefinitions(),
			...getHistoryToolDefinitions(),
			...getReportToolDefinitions(),
		],
	};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args = {} } = request.params;
	try {
		// Import handlers dynamically to keep this file clean
		const { handleToolCall } = await import("./tools/handler.js");
		return await handleToolCall(client, name, args as Record<string, unknown>);
	} catch (error) {
		return {
			content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
			isError: true,
		};
	}
});

const transport = new StdioServerTransport();
await server.connect(transport);

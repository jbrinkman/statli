import { createServer } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { StatliClient } from "./client.js";
import { getHistoryToolDefinitions } from "./tools/history.js";
import { getProjectToolDefinitions } from "./tools/projects.js";
import { getReportToolDefinitions } from "./tools/reports.js";
import { getReviewToolDefinitions } from "./tools/reviews.js";

const apiUrl = process.env.STATLI_API_URL || "http://127.0.0.1:4321";
const apiKey = process.env.STATLI_API_KEY;
const mcpPort = Number(process.env.MCP_PORT || "4322");

if (!apiKey) {
	console.error("STATLI_API_KEY environment variable is required");
	process.exit(1);
}

const client = new StatliClient(apiUrl, apiKey);

try {
	await client.healthCheck();
	console.log(`Connected to Statli API at ${apiUrl}`);
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
		const { handleToolCall } = await import("./tools/handler.js");
		return await handleToolCall(client, name, args as Record<string, unknown>);
	} catch (error) {
		return {
			content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
			isError: true,
		};
	}
});

// Stateless HTTP transport — no session tracking needed for this use case
const httpServer = createServer(async (req, res) => {
	const url = new URL(req.url || "/", `http://localhost:${mcpPort}`);

	if (url.pathname === "/mcp" && req.method === "POST") {
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined, // Stateless
		});
		await server.connect(transport);
		await transport.handleRequest(req, res);
	} else if (url.pathname === "/health") {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ status: "ok", tools: 12 }));
	} else {
		res.writeHead(404);
		res.end("Not Found");
	}
});

httpServer.listen(mcpPort, "127.0.0.1", () => {
	console.log(`Statli MCP server listening on http://127.0.0.1:${mcpPort}/mcp`);
});

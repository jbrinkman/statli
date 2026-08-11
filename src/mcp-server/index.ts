import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StatliClient } from "./client.js";

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

// Tool registration added in subsequent tasks
const transport = new StdioServerTransport();
await server.connect(transport);

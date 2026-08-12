import fs from "node:fs";
import { createDatabase } from "../src/lib/db/index.js";
import { listProjects } from "../src/lib/db/projects.js";
import { getChangeHistory } from "../src/lib/db/history.js";
import { renderReport } from "./lib/report-renderer.js";

const sinceArg = process.argv.includes("--since")
	? process.argv[process.argv.indexOf("--since") + 1]
	: undefined;
const outputArg = process.argv.includes("--output")
	? process.argv[process.argv.indexOf("--output") + 1]
	: undefined;

const since = sinceArg || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const db = createDatabase();
const projects = listProjects(db);
const history = getChangeHistory(db, undefined, since);

const report = renderReport({ projects, history, since });

if (outputArg) {
	fs.writeFileSync(outputArg, report, "utf-8");
	console.log(`Report written to ${outputArg}`);
} else {
	console.log(report);
}

db.close();

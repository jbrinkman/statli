import { describe, expect, it } from "vitest";
import { parseConfluenceHtml } from "../../src/scripts/validate.js";

describe("validation - HTML parsing", () => {
	it("parses HTML table rows into projects", () => {
		const html = `
			<table>
				<tr><th>Project</th><th>Status</th></tr>
				<tr><td>LocalAI</td><td>In Progress</td></tr>
				<tr><td>Spring AI</td><td>Submitted</td></tr>
			</table>
		`;
		const projects = parseConfluenceHtml(html);
		expect(projects).toHaveLength(2);
		expect(projects[0].name).toBe("LocalAI");
		expect(projects[0].status).toBe("in progress");
		expect(projects[1].name).toBe("Spring AI");
	});

	it("handles empty table", () => {
		const html = "<table><tr><th>Name</th></tr></table>";
		const projects = parseConfluenceHtml(html);
		expect(projects).toEqual([]);
	});

	it("strips HTML tags from cell content", () => {
		const html = `
			<table>
				<tr><td><a href="#">LocalAI</a></td><td><strong>Merged</strong></td></tr>
			</table>
		`;
		const projects = parseConfluenceHtml(html);
		expect(projects[0].name).toBe("LocalAI");
		expect(projects[0].status).toBe("merged");
	});

	it("skips rows with empty name", () => {
		const html = `
			<table>
				<tr><td></td><td>Status</td></tr>
				<tr><td>Valid</td><td>Done</td></tr>
			</table>
		`;
		const projects = parseConfluenceHtml(html);
		expect(projects).toHaveLength(1);
		expect(projects[0].name).toBe("Valid");
	});
});

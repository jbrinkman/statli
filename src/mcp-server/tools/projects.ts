export function getProjectToolDefinitions() {
	return [
		{
			name: "list_projects",
			description: "List all projects with optional filters",
			inputSchema: {
				type: "object" as const,
				properties: {
					status: {
						type: "string",
						enum: ["in_progress", "submitted", "merged", "completed", "dropped"],
					},
					category: {
						type: "string",
						enum: [
							"integration",
							"valkey_module",
							"valkey_glide",
							"valkey_docs_demos",
							"infrastructure",
						],
					},
					needs_review: { type: "boolean" },
				},
			},
		},
		{
			name: "get_project",
			description: "Get a project by ID or name",
			inputSchema: {
				type: "object" as const,
				properties: {
					identifier: { type: "string", description: "Project UUID or name" },
				},
				required: ["identifier"],
			},
		},
		{
			name: "create_project",
			description: "Create a new project",
			inputSchema: {
				type: "object" as const,
				properties: {
					name: { type: "string" },
					category: {
						type: "string",
						enum: [
							"integration",
							"valkey_module",
							"valkey_glide",
							"valkey_docs_demos",
							"infrastructure",
						],
					},
					release_model: {
						type: "string",
						enum: ["github_release", "merge_is_complete", "pypi", "npm", "nuget", "manual"],
					},
					status: {
						type: "string",
						enum: ["in_progress", "submitted", "merged", "completed", "dropped"],
					},
					pr_urls: { type: "array", items: { type: "string" } },
					issue_urls: { type: "array", items: { type: "string" } },
					release_url: { type: "string" },
					drop_reason: { type: "string" },
					notes: { type: "string" },
				},
				required: ["name", "category", "release_model"],
			},
		},
		{
			name: "update_project",
			description: "Update a project by ID or name",
			inputSchema: {
				type: "object" as const,
				properties: {
					identifier: { type: "string", description: "Project UUID or name" },
					status: { type: "string" },
					category: { type: "string" },
					release_model: { type: "string" },
					pr_urls: { type: "array", items: { type: "string" } },
					issue_urls: { type: "array", items: { type: "string" } },
					release_url: { type: "string" },
					drop_reason: { type: "string" },
					notes: { type: "string" },
					force: { type: "boolean", description: "Force update on locked project" },
				},
				required: ["identifier"],
			},
		},
		{
			name: "delete_project",
			description: "Soft-delete a project by ID or name",
			inputSchema: {
				type: "object" as const,
				properties: {
					identifier: { type: "string", description: "Project UUID or name" },
				},
				required: ["identifier"],
			},
		},
		{
			name: "lock_project",
			description: "Lock a project to prevent automated status changes",
			inputSchema: {
				type: "object" as const,
				properties: {
					identifier: { type: "string", description: "Project UUID or name" },
				},
				required: ["identifier"],
			},
		},
		{
			name: "unlock_project",
			description: "Unlock a project to allow automated status changes",
			inputSchema: {
				type: "object" as const,
				properties: {
					identifier: { type: "string", description: "Project UUID or name" },
				},
				required: ["identifier"],
			},
		},
	];
}

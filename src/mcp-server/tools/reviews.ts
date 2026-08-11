export function getReviewToolDefinitions() {
	return [
		{
			name: "list_review_items",
			description: "List review items with optional filters",
			inputSchema: {
				type: "object" as const,
				properties: {
					project_id: { type: "string", description: "Filter by project ID" },
					resolved: { type: "boolean", description: "Filter by resolved status" },
					type: {
						type: "string",
						enum: ["release_model", "status_change", "ambiguous_signal"],
					},
				},
			},
		},
		{
			name: "add_review_item",
			description: "Add a review item to a project",
			inputSchema: {
				type: "object" as const,
				properties: {
					project_id: { type: "string", description: "Project ID" },
					type: {
						type: "string",
						enum: ["release_model", "status_change", "ambiguous_signal"],
					},
					reason: { type: "string", description: "Reason for the review item" },
				},
				required: ["project_id", "type", "reason"],
			},
		},
		{
			name: "resolve_review_item",
			description: "Resolve a review item",
			inputSchema: {
				type: "object" as const,
				properties: {
					id: { type: "string", description: "Review item ID" },
				},
				required: ["id"],
			},
		},
	];
}

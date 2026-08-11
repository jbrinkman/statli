export class StatliClientError extends Error {
	status: number;
	code: string;

	constructor(message: string, status: number, code: string) {
		super(message);
		this.name = "StatliClientError";
		this.status = status;
		this.code = code;
	}
}

export class StatliClient {
	private baseUrl: string;
	private apiKey: string;

	constructor(baseUrl: string, apiKey: string) {
		this.baseUrl = baseUrl.replace(/\/$/, "");
		this.apiKey = apiKey;
	}

	private headers(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.apiKey}`,
			"Content-Type": "application/json",
		};
	}

	async get<T>(path: string, params?: Record<string, string>): Promise<T> {
		const url = new URL(`${this.baseUrl}${path}`);
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined && value !== "") {
					url.searchParams.set(key, value);
				}
			}
		}
		const response = await fetch(url.toString(), { headers: this.headers() });
		return this.handleResponse<T>(response);
	}

	async post<T>(path: string, body?: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: "POST",
			headers: this.headers(),
			body: body ? JSON.stringify(body) : undefined,
		});
		return this.handleResponse<T>(response);
	}

	async put<T>(path: string, body: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: "PUT",
			headers: this.headers(),
			body: JSON.stringify(body),
		});
		return this.handleResponse<T>(response);
	}

	async delete<T>(path: string): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: "DELETE",
			headers: this.headers(),
		});
		return this.handleResponse<T>(response);
	}

	async healthCheck(): Promise<void> {
		const response = await fetch(`${this.baseUrl}/api/projects?limit=1`, {
			headers: this.headers(),
		});
		if (!response.ok) {
			throw new StatliClientError(
				`Health check failed: ${response.status}`,
				response.status,
				"HEALTH_CHECK_FAILED",
			);
		}
	}

	private async handleResponse<T>(response: Response): Promise<T> {
		const body = await response.json();
		if (!response.ok) {
			const error = body.error || { message: "Unknown error", code: "UNKNOWN" };
			throw new StatliClientError(error.message, response.status, error.code);
		}
		return body.data as T;
	}
}

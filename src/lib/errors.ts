export class AppError extends Error {
	code: string;
	status: number;

	constructor(message: string, code: string, status: number) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.status = status;
	}
}

export class NotFoundError extends AppError {
	constructor(message = "Resource not found") {
		super(message, "NOT_FOUND", 404);
		this.name = "NotFoundError";
	}
}

export class ConflictError extends AppError {
	constructor(message = "Resource conflict") {
		super(message, "CONFLICT", 409);
		this.name = "ConflictError";
	}
}

export class ValidationError extends AppError {
	details: unknown;

	constructor(message = "Validation failed", details?: unknown) {
		super(message, "VALIDATION_ERROR", 400);
		this.name = "ValidationError";
		this.details = details;
	}
}

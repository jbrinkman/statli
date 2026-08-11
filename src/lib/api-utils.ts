import { ZodError } from "zod";
import { AppError } from "./errors.js";

export function successResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify({ data }), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export function createdResponse(data: unknown): Response {
	return successResponse(data, 201);
}

export function errorResponse(error: AppError): Response {
	const body: { error: { message: string; code: string; details?: unknown } } = {
		error: {
			message: error.message,
			code: error.code,
		},
	};

	if ("details" in error && error.details) {
		body.error.details = error.details;
	}

	return new Response(JSON.stringify(body), {
		status: error.status,
		headers: { "Content-Type": "application/json" },
	});
}

export function handleApiError(error: unknown): Response {
	if (error instanceof AppError) {
		return errorResponse(error);
	}

	if (error instanceof ZodError) {
		return new Response(
			JSON.stringify({
				error: {
					message: "Validation failed",
					code: "VALIDATION_ERROR",
					details: error.issues,
				},
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	return new Response(
		JSON.stringify({
			error: {
				message: "Internal server error",
				code: "INTERNAL_ERROR",
			},
		}),
		{
			status: 500,
			headers: { "Content-Type": "application/json" },
		},
	);
}

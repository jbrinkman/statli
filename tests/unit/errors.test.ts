import { describe, expect, it } from "vitest";
import { type ZodError, z } from "zod";
import { handleApiError } from "../../src/lib/api-utils.js";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../../src/lib/errors.js";

describe("error classes", () => {
	it("NotFoundError has correct properties", () => {
		const err = new NotFoundError("Project not found");
		expect(err.status).toBe(404);
		expect(err.code).toBe("NOT_FOUND");
		expect(err.message).toBe("Project not found");
		expect(err).toBeInstanceOf(AppError);
	});

	it("ConflictError has correct properties", () => {
		const err = new ConflictError("Project is locked");
		expect(err.status).toBe(409);
		expect(err.code).toBe("CONFLICT");
		expect(err.message).toBe("Project is locked");
	});

	it("ValidationError has correct properties with details", () => {
		const details = [{ field: "name", message: "required" }];
		const err = new ValidationError("Invalid input", details);
		expect(err.status).toBe(400);
		expect(err.code).toBe("VALIDATION_ERROR");
		expect(err.details).toEqual(details);
	});
});

describe("handleApiError", () => {
	it("maps AppError to correct response", async () => {
		const response = handleApiError(new NotFoundError("Not found"));
		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.error.code).toBe("NOT_FOUND");
		expect(body.error.message).toBe("Not found");
	});

	it("maps ZodError to 400 with issues", async () => {
		const schema = z.object({ name: z.string() });
		let zodErr: ZodError | undefined;
		try {
			schema.parse({});
		} catch (e) {
			zodErr = e as ZodError;
		}

		const response = handleApiError(zodErr);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
		expect(body.error.details).toBeDefined();
		expect(Array.isArray(body.error.details)).toBe(true);
	});

	it("maps unknown errors to 500", async () => {
		const response = handleApiError(new Error("Something broke"));
		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error.code).toBe("INTERNAL_ERROR");
	});
});

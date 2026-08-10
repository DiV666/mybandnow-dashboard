import { describe, expect, it } from "vitest";
import { hasResponseStatus } from "./httpErrorStatus.js";

describe("hasResponseStatus", () => {
	it("matches when response.status equals the given status", () => {
		const error = { response: { status: 404 } };
		expect(hasResponseStatus(error, 404)).toBe(true);
	});

	it("does not match when response.status differs from the given status", () => {
		const error = { response: { status: 500 } };
		expect(hasResponseStatus(error, 404)).toBe(false);
	});

	it("rejects an error with no response property", () => {
		expect(hasResponseStatus(new Error("network error"), 404)).toBe(false);
	});

	it("rejects a response with no status property", () => {
		expect(hasResponseStatus({ response: {} }, 404)).toBe(false);
	});

	it("rejects when response is not an object", () => {
		expect(hasResponseStatus({ response: "404" }, 404)).toBe(false);
	});

	it("rejects when response is null", () => {
		expect(hasResponseStatus({ response: null }, 404)).toBe(false);
	});

	it("rejects null and non-object errors", () => {
		expect(hasResponseStatus(null, 404)).toBe(false);
		expect(hasResponseStatus(undefined, 404)).toBe(false);
		expect(hasResponseStatus("not an error", 404)).toBe(false);
	});

	it("narrows the type so response.status is safely accessible", () => {
		const error: unknown = { response: { status: 409 } };
		if (hasResponseStatus(error, 409)) {
			expect(error.response.status).toBe(409);
		} else {
			throw new Error("expected hasResponseStatus to return true");
		}
	});
});

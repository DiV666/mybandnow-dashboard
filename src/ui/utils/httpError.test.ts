import { describe, expect, it } from "vitest";
import { isHttpErrorLike } from "./httpError.js";

describe("isHttpErrorLike", () => {
	it("accepts a plain object", () => {
		expect(isHttpErrorLike({})).toBe(true);
	});

	it("accepts an object shaped like an Axios error", () => {
		expect(
			isHttpErrorLike({
				response: { status: 404, data: { message: "Not found" } },
				message: "Request failed with status code 404",
				name: "AxiosError",
				code: "ERR_BAD_REQUEST",
			}),
		).toBe(true);
	});

	it("accepts a real Error instance", () => {
		expect(isHttpErrorLike(new Error("boom"))).toBe(true);
	});

	it("rejects null", () => {
		expect(isHttpErrorLike(null)).toBe(false);
	});

	it("rejects undefined", () => {
		expect(isHttpErrorLike(undefined)).toBe(false);
	});

	it("rejects primitives", () => {
		expect(isHttpErrorLike("network error")).toBe(false);
		expect(isHttpErrorLike(42)).toBe(false);
		expect(isHttpErrorLike(true)).toBe(false);
	});

	it("narrows the type so response.status is safely accessible", () => {
		const error: unknown = { response: { status: 409 } };
		if (isHttpErrorLike(error)) {
			expect(error.response?.status).toBe(409);
		} else {
			throw new Error("expected isHttpErrorLike to return true");
		}
	});
});

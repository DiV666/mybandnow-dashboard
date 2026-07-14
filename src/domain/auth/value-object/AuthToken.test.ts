import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthToken } from "./AuthToken.js";

describe("AuthToken", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const createMockJwt = (payload: Record<string, unknown>) => {
		const encodedPayload = btoa(JSON.stringify(payload));
		return `header.${encodedPayload}.signature`;
	};

	it("should parse the expiration time from the JWT", () => {
		const mockJwt = createMockJwt({ exp: 1700000000 });
		const token = new AuthToken(mockJwt);

		expect(token.getExpirationTimeMs()).toBe(1700000000 * 1000);
	});

	it("should know if the token is expired", () => {
		const mockJwt = createMockJwt({ exp: 1700000000 });
		const token = new AuthToken(mockJwt);

		vi.setSystemTime(new Date(1700000001 * 1000));
		expect(token.isExpired()).toBe(true);

		vi.setSystemTime(new Date(1699999999 * 1000));
		expect(token.isExpired()).toBe(false);
	});

	it("treats tokens without a numeric exp claim as expired", () => {
		const token = new AuthToken(createMockJwt({ exp: "1700000000" }));

		expect(token.getExpirationTimeMs()).toBeNull();
		expect(token.isExpired()).toBe(true);
	});
});

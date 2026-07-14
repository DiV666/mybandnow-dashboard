import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosAuthRepository } from "./AxiosAuthRepository.js";
import { httpClient } from "../http/httpClient.js";

describe("AxiosAuthRepository", () => {
	const repository = new AxiosAuthRepository();

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("posts credentials to the login endpoint and returns the access token", async () => {
		const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue({
			data: { accessToken: "header.payload.signature" },
		} as never);

		const token = await repository.login("user@example.com", "secret");

		expect(postSpy).toHaveBeenCalledWith("/v1/auth/login", {
			email: "user@example.com",
			password: "secret",
		});
		expect(token.value).toBe("header.payload.signature");
	});

	it("propagates invalid credential errors as 401 responses", async () => {
		const unauthorizedError = { response: { status: 401 } };
		vi.spyOn(httpClient, "post").mockRejectedValue(unauthorizedError);

		await expect(
			repository.login("user@example.com", "wrong-password"),
		).rejects.toBe(unauthorizedError);
	});
});

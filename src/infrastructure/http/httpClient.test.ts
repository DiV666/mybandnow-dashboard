import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { httpClient } from "./httpClient.js";
import {
	configureHttpClientRuntime,
	resetHttpClientRuntime,
} from "./httpClientRuntime.js";

const createAdapterResponse = (config: InternalAxiosRequestConfig) => ({
	data: { ok: true },
	status: 200,
	statusText: "OK",
	headers: {},
	config,
});

describe("httpClient", () => {
	const originalAdapter = httpClient.defaults.adapter;

	beforeEach(() => {
		resetHttpClientRuntime();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		httpClient.defaults.adapter = originalAdapter;
		resetHttpClientRuntime();
	});

	it("adds correlation id and auth header from the configured runtime", async () => {
		const adapter = vi.fn<AxiosAdapter>(async (config) =>
			createAdapterResponse(config),
		);
		httpClient.defaults.adapter = adapter;

		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			"11111111-1111-4111-8111-111111111111",
		);
		configureHttpClientRuntime({
			getAuthToken: () => "token-123",
		});

		await httpClient.get("/v1/profile");

		expect(adapter).toHaveBeenCalledOnce();
		const config = adapter.mock.calls[0][0];
		expect(config.headers["x-correlation-id"]).toBe(
			"11111111-1111-4111-8111-111111111111",
		);
		expect(config.headers.Authorization).toBe("Bearer token-123");
	});

	it("waits for profile completion only on private mutating requests", async () => {
		const adapter = vi.fn<AxiosAdapter>(async (config) =>
			createAdapterResponse(config),
		);
		httpClient.defaults.adapter = adapter;

		const beforeMutatingRequest = vi.fn(async () => undefined);
		configureHttpClientRuntime({
			getAuthToken: () => "token-123",
			beforeMutatingRequest,
		});

		await httpClient.post("/v1/bands", { name: "The Experience" });
		await httpClient.post("/v1/profile", {
			id: "1",
			name: "Jimi",
			username: "jimi",
		});
		await httpClient.post("/v1/auth/login", {
			email: "user@example.com",
			password: "secret",
		});
		await httpClient.get("/v1/bands");

		expect(beforeMutatingRequest).toHaveBeenCalledTimes(1);
		expect(beforeMutatingRequest).toHaveBeenCalledWith("post", "/v1/bands");
	});

	it("notifies the runtime when a 401 response is received", async () => {
		const unauthorizedError = { response: { status: 401 } };
		const onUnauthorized = vi.fn();

		configureHttpClientRuntime({ onUnauthorized });
		httpClient.defaults.adapter = vi.fn<AxiosAdapter>(async () => {
			throw unauthorizedError;
		});

		await expect(httpClient.get("/v1/profile")).rejects.toBe(unauthorizedError);

		expect(onUnauthorized).toHaveBeenCalledOnce();
	});
});

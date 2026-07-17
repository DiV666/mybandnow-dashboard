import axios from "axios";
import {
	getHttpClientAuthToken,
	notifyBackendUnavailable,
	notifyUnauthorized,
	runBeforeMutatingRequest,
} from "./httpClientRuntime.js";

// Create an isolated HTTP client instance.
export const httpClient = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

// Inject the correlation id and pause mutating requests until the profile is ready.
httpClient.interceptors.request.use(async (config) => {
	const correlationId = crypto.randomUUID();
	const token = getHttpClientAuthToken();

	config.headers["x-correlation-id"] = correlationId;

	if (token) {
		config.headers["Authorization"] = `Bearer ${token}`;
	}

	await runBeforeMutatingRequest(config.method ?? "", config.url ?? "");

	return config;
}, Promise.reject);

// Capture unauthorized responses and notify the session handler.
httpClient.interceptors.response.use(
	(response) => response,
	(error: unknown) => {
		const status =
			typeof error === "object" &&
			error !== null &&
			"response" in error &&
			typeof error.response === "object" &&
			error.response !== null &&
			"status" in error.response &&
			typeof error.response.status === "number"
				? error.response.status
				: undefined;

		notifyUnauthorized(status);
		notifyBackendUnavailable(error);
		return Promise.reject(error);
	},
);

import axios from "axios";
import {
	getHttpClientAuthToken,
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
	(error: { response?: { status?: number } }) => {
		notifyUnauthorized(error.response?.status);
		return Promise.reject(error);
	},
);

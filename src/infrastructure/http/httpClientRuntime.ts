import { browserSessionStorage } from "../storage/browserSessionStorage.js";

type HttpClientRuntimeConfig = {
	getAuthToken?: () => string | null;
	beforeMutatingRequest?: (method: string, url: string) => Promise<void> | void;
	onUnauthorized?: () => void;
	onBackendUnavailable?: () => void;
};

interface HttpClientErrorResponse {
	status?: number;
}

interface HttpClientErrorLike {
	response?: HttpClientErrorResponse;
	code?: string;
	message?: string;
}

const defaultRuntime = (): Required<HttpClientRuntimeConfig> => ({
	getAuthToken: () => browserSessionStorage.getAuthToken(),
	beforeMutatingRequest: () => undefined,
	onUnauthorized: () => undefined,
	onBackendUnavailable: () => undefined,
});

let runtime = defaultRuntime();

const mutatingMethods = new Set(["post", "put", "delete", "patch"]);

export function configureHttpClientRuntime(
	config: HttpClientRuntimeConfig,
): void {
	runtime = {
		...runtime,
		...config,
	};
}

export function resetHttpClientRuntime(): void {
	runtime = defaultRuntime();
}

export const getHttpClientAuthToken = (): string | null =>
	runtime.getAuthToken();

export async function runBeforeMutatingRequest(
	method: string,
	url: string,
): Promise<void> {
	const normalizedMethod = method.toLowerCase();

	if (!mutatingMethods.has(normalizedMethod)) {
		return;
	}

	if (url.includes("/v1/profile") || url.includes("/v1/auth")) {
		return;
	}

	await runtime.beforeMutatingRequest(normalizedMethod, url);
}

export function notifyUnauthorized(status: number | undefined): void {
	if (status === 401) {
		runtime.onUnauthorized();
	}
}

const backendUnavailableCodes = new Set([
	"ECONNABORTED",
	"ECONNREFUSED",
	"ERR_CONNECTION_REFUSED",
	"ERR_NETWORK",
]);

function isHttpClientErrorLike(error: unknown): error is HttpClientErrorLike {
	return typeof error === "object" && error !== null;
}

export function notifyBackendUnavailable(error: unknown): void {
	if (!isHttpClientErrorLike(error)) {
		return;
	}

	if (error.response) {
		return;
	}

	const normalizedMessage = error.message?.toLowerCase() ?? "";
	const hasKnownCode =
		typeof error.code === "string" && backendUnavailableCodes.has(error.code);
	const hasNetworkMessage =
		normalizedMessage.includes("network") ||
		normalizedMessage.includes("connection refused") ||
		normalizedMessage.includes("failed to fetch");

	if (hasKnownCode || hasNetworkMessage) {
		runtime.onBackendUnavailable();
	}
}

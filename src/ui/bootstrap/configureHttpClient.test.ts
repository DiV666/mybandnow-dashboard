import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
	notifyBackendUnavailable,
	notifyUnauthorized,
	resetHttpClientRuntime,
} from "../../infrastructure/http/httpClientRuntime.js";

const { sessionStorage } = vi.hoisted(() => ({
	sessionStorage: {
		getAuthToken: vi.fn<() => string | null>(),
		setAuthToken: vi.fn<(token: string) => void>(),
		clearAuthToken: vi.fn<() => void>(),
	},
}));

vi.mock("../../infrastructure/storage/browserSessionStorage.js", () => ({
	browserSessionStorage: sessionStorage,
}));

import { configureHttpClient } from "./configureHttpClient.js";
import { useAuthStore } from "../stores/useAuthStore.js";
import { useBackendStatusStore } from "../stores/useBackendStatusStore.js";

describe("configureHttpClient", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		resetHttpClientRuntime();
		sessionStorage.getAuthToken.mockReset();
		sessionStorage.setAuthToken.mockReset();
		sessionStorage.clearAuthToken.mockReset();
		sessionStorage.getAuthToken.mockReturnValue(null);
	});

	it("marks the backend as unavailable without expiring the session", () => {
		const authStore = useAuthStore();
		const backendStatusStore = useBackendStatusStore();

		authStore.setToken("token-123");
		configureHttpClient();
		notifyBackendUnavailable({ code: "ERR_NETWORK", message: "Network Error" });

		expect(backendStatusStore.isBackendUnavailable).toBe(true);
		expect(authStore.isSessionExpired).toBe(false);
		expect(authStore.token).toBe("token-123");
		expect(sessionStorage.clearAuthToken).not.toHaveBeenCalled();
	});

	it("keeps the existing session-expired flow for 401 responses", () => {
		const authStore = useAuthStore();
		const backendStatusStore = useBackendStatusStore();

		authStore.setToken("token-123");
		configureHttpClient();
		notifyUnauthorized(401);

		expect(authStore.isSessionExpired).toBe(true);
		expect(backendStatusStore.isBackendUnavailable).toBe(false);
	});
});

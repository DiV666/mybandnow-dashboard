import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

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

import { useAuthStore } from "./useAuthStore.js";

describe("useAuthStore", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		sessionStorage.getAuthToken.mockReset();
		sessionStorage.setAuthToken.mockReset();
		sessionStorage.clearAuthToken.mockReset();
	});

	it("hydrates the token from the session storage abstraction", () => {
		sessionStorage.getAuthToken.mockReturnValue("persisted-token");

		const store = useAuthStore();

		expect(store.token).toBe("persisted-token");
		expect(sessionStorage.getAuthToken).toHaveBeenCalledOnce();
	});

	it("persists and clears the token through the session storage abstraction", () => {
		sessionStorage.getAuthToken.mockReturnValue(null);

		const store = useAuthStore();

		store.setToken("new-token");
		expect(sessionStorage.setAuthToken).toHaveBeenCalledWith("new-token");

		store.logout();
		expect(sessionStorage.clearAuthToken).toHaveBeenCalledOnce();
	});
});

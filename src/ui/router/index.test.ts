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

vi.mock("vue-router", async () => {
	const actual =
		await vi.importActual<typeof import("vue-router")>("vue-router");

	return {
		...actual,
		createWebHistory: actual.createMemoryHistory,
	};
});

vi.mock("bootstrap", () => ({
	Tooltip: {
		getOrCreateInstance: vi.fn(() => ({
			dispose: vi.fn(),
		})),
	},
}));

import { router } from "./index.js";
import { useAuthStore } from "../stores/useAuthStore.js";

describe("dashboard routes", () => {
	beforeEach(async () => {
		setActivePinia(createPinia());
		sessionStorage.getAuthToken.mockReset();
		sessionStorage.setAuthToken.mockReset();
		sessionStorage.clearAuthToken.mockReset();
		sessionStorage.getAuthToken.mockReturnValue(null);
		await router.push("/");
	});

	it("redirects /dashboard to the songs manager for authenticated users", async () => {
		const authStore = useAuthStore();
		authStore.setToken("token-123");

		await router.push("/dashboard");

		expect(router.currentRoute.value.name).toBe("SongsManager");
		expect(router.currentRoute.value.fullPath).toBe("/dashboard/songs");
	});

	it("resolves the profile route inside the authenticated dashboard shell", async () => {
		const authStore = useAuthStore();
		authStore.setToken("token-123");

		await router.push("/dashboard/profile");

		expect(router.currentRoute.value.name).toBe("Profile");
		expect(router.currentRoute.value.fullPath).toBe("/dashboard/profile");
	});

	it("resolves the song track editor route inside the authenticated dashboard shell", async () => {
		const authStore = useAuthStore();
		authStore.setToken("token-123");

		await router.push(
			"/dashboard/songs/song-123/tracks?title=Paint%20It%20Black",
		);

		expect(router.currentRoute.value.name).toBe("SongTrackEditor");
		expect(router.currentRoute.value.params.songId).toBe("song-123");
		expect(router.currentRoute.value.fullPath).toBe(
			"/dashboard/songs/song-123/tracks?title=Paint%20It%20Black",
		);
	});
});

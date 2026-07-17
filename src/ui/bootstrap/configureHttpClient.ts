import { configureHttpClientRuntime } from "../../infrastructure/http/httpClientRuntime.js";
import { useAuthStore } from "../stores/useAuthStore.js";
import { useBackendStatusStore } from "../stores/useBackendStatusStore.js";
import { useMusicianStore } from "../stores/useMusicianStore.js";

export function configureHttpClient(): void {
	const authStore = useAuthStore();
	const backendStatusStore = useBackendStatusStore();
	const musicianStore = useMusicianStore();

	configureHttpClientRuntime({
		getAuthToken: () => authStore.token,
		beforeMutatingRequest: async () => {
			if (authStore.isAuthenticated && !musicianStore.hasProfile) {
				await musicianStore.requireProfileCompletion();
			}
		},
		onUnauthorized: () => {
			backendStatusStore.clear();
			if (authStore.isAuthenticated) {
				authStore.setSessionExpired(true);
			}
		},
		onBackendUnavailable: () => {
			backendStatusStore.markUnavailable();
		},
	});
}

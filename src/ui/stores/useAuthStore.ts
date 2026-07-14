import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { AuthToken } from "../../domain/auth/value-object/AuthToken.js";
import { browserSessionStorage } from "../../infrastructure/storage/browserSessionStorage.js";

export const useAuthStore = defineStore("auth", () => {
	const token = ref<string | null>(browserSessionStorage.getAuthToken());
	const isSessionExpired = ref(false);
	let expirationTimer: number | null = null;

	const isAuthenticated = computed(() => Boolean(token.value));

	function startExpirationTimer(tokenString: string) {
		if (expirationTimer) clearTimeout(expirationTimer);

		try {
			const authToken = new AuthToken(tokenString);
			const exp = authToken.getExpirationTimeMs();

			if (exp) {
				const timeUntilExp = exp - Date.now();

				if (timeUntilExp <= 0) {
					isSessionExpired.value = true;
				} else {
					// Mark the session as expired when the token expiration is reached.
					expirationTimer = window.setTimeout(() => {
						isSessionExpired.value = true;
					}, timeUntilExp);
				}
			}
		} catch {
			// Ignore tokens that are invalid or do not expose an expiration.
		}
	}

	function setToken(newToken: string) {
		token.value = newToken;
		isSessionExpired.value = false;
		browserSessionStorage.setAuthToken(newToken);
		startExpirationTimer(newToken);
	}

	function setSessionExpired(value: boolean) {
		isSessionExpired.value = value;
	}

	function logout() {
		token.value = null;
		isSessionExpired.value = false;
		browserSessionStorage.clearAuthToken();
		if (expirationTimer) clearTimeout(expirationTimer);
	}

	// Restore the expiration timer when a token already exists.
	if (token.value) {
		startExpirationTimer(token.value);
	}

	return {
		token,
		isAuthenticated,
		isSessionExpired,
		setToken,
		setSessionExpired,
		logout,
	};
});

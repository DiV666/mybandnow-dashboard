type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const AUTH_TOKEN_KEY = "auth_token";
const SELECTED_BAND_ID_KEY = "selected_band_id";
const SKIPPED_BAND_ONBOARDING_KEY = "skipped_band_onboarding";
const PREFERRED_THEME_KEY = "preferred_theme";

class BrowserSessionStorage {
	private storage(): StorageLike | null {
		if (globalThis.localStorage === undefined) {
			return null;
		}

		return globalThis.localStorage;
	}

	private read(key: string): string | null {
		try {
			return this.storage()?.getItem(key) ?? null;
		} catch {
			return null;
		}
	}

	private write(key: string, value: string): void {
		try {
			this.storage()?.setItem(key, value);
		} catch {
			// Ignore storage failures and keep the UI usable.
		}
	}

	private remove(key: string): void {
		try {
			this.storage()?.removeItem(key);
		} catch {
			// Ignore storage failures and keep the UI usable.
		}
	}

	getAuthToken(): string | null {
		return this.read(AUTH_TOKEN_KEY);
	}

	setAuthToken(token: string): void {
		this.write(AUTH_TOKEN_KEY, token);
	}

	clearAuthToken(): void {
		this.remove(AUTH_TOKEN_KEY);
	}

	getSelectedBandId(): string | null {
		return this.read(SELECTED_BAND_ID_KEY);
	}

	setSelectedBandId(bandId: string): void {
		this.write(SELECTED_BAND_ID_KEY, bandId);
	}

	clearSelectedBandId(): void {
		this.remove(SELECTED_BAND_ID_KEY);
	}

	getSkippedBandOnboarding(): boolean {
		return this.read(SKIPPED_BAND_ONBOARDING_KEY) === "true";
	}

	setSkippedBandOnboarding(value: boolean): void {
		this.write(SKIPPED_BAND_ONBOARDING_KEY, String(value));
	}

	clearSkippedBandOnboarding(): void {
		this.remove(SKIPPED_BAND_ONBOARDING_KEY);
	}

	getPreferredTheme(): string | null {
		return this.read(PREFERRED_THEME_KEY);
	}

	setPreferredTheme(theme: string): void {
		this.write(PREFERRED_THEME_KEY, theme);
	}

	clearPreferredTheme(): void {
		this.remove(PREFERRED_THEME_KEY);
	}
}

export const browserSessionStorage = new BrowserSessionStorage();

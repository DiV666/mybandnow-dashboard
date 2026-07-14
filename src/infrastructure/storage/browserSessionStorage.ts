type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const AUTH_TOKEN_KEY = "auth_token";
const SELECTED_BAND_ID_KEY = "selected_band_id";

class BrowserSessionStorage {
	private storage(): StorageLike | null {
		if (typeof globalThis.localStorage === "undefined") {
			return null;
		}

		return globalThis.localStorage;
	}

	getAuthToken(): string | null {
		return this.storage()?.getItem(AUTH_TOKEN_KEY) ?? null;
	}

	setAuthToken(token: string): void {
		this.storage()?.setItem(AUTH_TOKEN_KEY, token);
	}

	clearAuthToken(): void {
		this.storage()?.removeItem(AUTH_TOKEN_KEY);
	}

	getSelectedBandId(): string | null {
		return this.storage()?.getItem(SELECTED_BAND_ID_KEY) ?? null;
	}

	setSelectedBandId(bandId: string): void {
		this.storage()?.setItem(SELECTED_BAND_ID_KEY, bandId);
	}

	clearSelectedBandId(): void {
		this.storage()?.removeItem(SELECTED_BAND_ID_KEY);
	}
}

export const browserSessionStorage = new BrowserSessionStorage();

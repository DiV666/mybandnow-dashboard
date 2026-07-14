type JwtPayload = {
	exp?: number;
	[key: string]: unknown;
};

const isJwtPayload = (value: unknown): value is JwtPayload => {
	return typeof value === "object" && value !== null;
};

export class AuthToken {
	readonly value: string;

	constructor(value: string) {
		if (!value) throw new Error("AuthToken cannot be empty");
		this.value = value;
	}

	private getPayload(): JwtPayload | null {
		try {
			const parts = this.value.split(".");
			if (parts.length !== 3) return null;
			// Use basic atob for browser/node compat (JWT payload is base64url)
			const base64Url = parts[1];
			const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
			const jsonPayload = atob(base64);
			const payload: unknown = JSON.parse(jsonPayload);

			return isJwtPayload(payload) ? payload : null;
		} catch {
			return null;
		}
	}

	getExpirationTimeMs(): number | null {
		const payload = this.getPayload();
		if (payload && typeof payload.exp === "number") {
			return payload.exp * 1000;
		}
		return null;
	}

	isExpired(): boolean {
		const exp = this.getExpirationTimeMs();
		if (!exp) return true; // If we can't parse it, treat as expired
		return Date.now() >= exp;
	}
}

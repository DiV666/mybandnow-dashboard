import { ValidationError } from "../../shared/ValidationError.js";

type JwtPayload = {
	exp?: number;
	[key: string]: unknown;
};

const isJwtPayload = (value: unknown): value is JwtPayload => {
	return typeof value === "object" && value !== null;
};

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Decodes base64 without relying on a platform global (atob/Buffer), so this
// domain class stays framework- and runtime-agnostic.
function decodeBase64(base64: string): string {
	const cleaned = base64.replace(/=+$/, "");
	let bits = 0;
	let buffer = 0;
	let output = "";

	for (const char of cleaned) {
		const index = BASE64_ALPHABET.indexOf(char);
		if (index === -1) continue;
		buffer = (buffer << 6) | index;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			output += String.fromCharCode((buffer >> bits) & 0xff);
		}
	}

	return output;
}

export class AuthToken {
	readonly value: string;

	constructor(value: string) {
		if (!value) throw new ValidationError("AuthToken cannot be empty");
		this.value = value;
	}

	private getPayload(): JwtPayload | null {
		try {
			const parts = this.value.split(".");
			if (parts.length !== 3) return null;
			const base64Url = parts[1];
			const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
			const jsonPayload = decodeBase64(base64);
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class MusicianEmail {
	readonly value: string;

	constructor(value: string) {
		const sanitizedValue = value.trim();

		if (!sanitizedValue) {
			throw new Error("MusicianEmail cannot be empty");
		}

		if (!EMAIL_PATTERN.test(sanitizedValue)) {
			throw new Error("MusicianEmail must be a valid email");
		}

		this.value = sanitizedValue;
	}
}

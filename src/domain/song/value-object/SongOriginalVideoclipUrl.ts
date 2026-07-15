export class SongOriginalVideoclipUrl {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new Error("SongOriginalVideoclipUrl cannot be empty");
		}

		try {
			new URL(value);
		} catch {
			throw new Error("SongOriginalVideoclipUrl must be a valid URL");
		}

		this.value = value;
	}
}

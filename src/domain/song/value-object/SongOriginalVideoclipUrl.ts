import { ValidationError } from "../../shared/ValidationError.js";

export class SongOriginalVideoclipUrl {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new ValidationError("SongOriginalVideoclipUrl cannot be empty");
		}

		try {
			new URL(value);
		} catch {
			throw new ValidationError("SongOriginalVideoclipUrl must be a valid URL");
		}

		this.value = value;
	}
}

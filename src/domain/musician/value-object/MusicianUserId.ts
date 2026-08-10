import { ValidationError } from "../../shared/ValidationError.js";

export class MusicianUserId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new ValidationError("MusicianUserId cannot be empty");
		}

		this.value = value;
	}
}

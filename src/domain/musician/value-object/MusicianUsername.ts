import { ValidationError } from "../../shared/ValidationError.js";

export class MusicianUsername {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new ValidationError("MusicianUsername cannot be empty");
		}

		this.value = value;
	}
}

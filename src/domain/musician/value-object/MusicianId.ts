import { ValidationError } from "../../shared/ValidationError.js";

export class MusicianId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new ValidationError("MusicianId cannot be empty");
		}

		this.value = value;
	}
}

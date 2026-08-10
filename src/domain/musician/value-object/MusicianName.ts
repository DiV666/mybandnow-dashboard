import { ValidationError } from "../../shared/ValidationError.js";

export class MusicianName {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new ValidationError("MusicianName cannot be empty");
		}

		this.value = value;
	}
}

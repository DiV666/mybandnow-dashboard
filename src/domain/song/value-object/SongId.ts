import { ValidationError } from "../../shared/ValidationError.js";

export class SongId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new ValidationError("SongId cannot be empty");
		}

		this.value = value;
	}
}

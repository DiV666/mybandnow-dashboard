import { ValidationError } from "../../shared/ValidationError.js";

export class SongTitle {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new ValidationError("SongTitle cannot be empty");
		}

		this.value = value;
	}
}

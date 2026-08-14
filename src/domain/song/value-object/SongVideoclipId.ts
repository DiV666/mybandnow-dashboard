import { ValidationError } from "../../shared/ValidationError.js";

export class SongVideoclipId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new ValidationError("SongVideoclipId cannot be empty");
		}

		this.value = value;
	}
}

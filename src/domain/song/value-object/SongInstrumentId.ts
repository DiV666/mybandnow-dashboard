import { ValidationError } from "../../shared/ValidationError.js";

export class SongInstrumentId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new ValidationError("SongInstrumentId cannot be empty");
		}

		this.value = value;
	}
}

import { ValidationError } from "../../shared/ValidationError.js";

export class SongInstrumentName {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new ValidationError("SongInstrumentName cannot be empty");
		}

		this.value = value;
	}
}

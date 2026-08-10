import { ValidationError } from "../../shared/ValidationError.js";

export class SongInstrumentType {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new ValidationError("SongInstrumentType cannot be empty");
		}

		this.value = value;
	}
}

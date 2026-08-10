import { ValidationError } from "../../shared/ValidationError.js";

export class InstrumentName {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new ValidationError("InstrumentName cannot be empty");
		}

		this.value = value;
	}
}

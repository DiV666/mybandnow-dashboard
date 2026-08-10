import { ValidationError } from "../../shared/ValidationError.js";

export class InstrumentId {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new ValidationError("InstrumentId cannot be empty");
		}

		this.value = value;
	}
}

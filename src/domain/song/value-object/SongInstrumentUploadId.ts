import { ValidationError } from "../../shared/ValidationError.js";

export class SongInstrumentUploadId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new ValidationError("SongInstrumentUploadId cannot be empty");
		}

		this.value = value;
	}
}

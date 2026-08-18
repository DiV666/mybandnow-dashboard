import { ValidationError } from "../../shared/ValidationError.js";

export class SongInstrumentStartTimeMs {
	readonly value: number;

	constructor(value: number) {
		if (!Number.isFinite(value)) {
			throw new ValidationError(
				"SongInstrumentStartTimeMs must be a finite number",
			);
		}

		this.value = value;
	}
}

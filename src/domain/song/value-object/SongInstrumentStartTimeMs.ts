import { ValidationError } from "../../shared/ValidationError.js";

export class SongInstrumentStartTimeMs {
	readonly value: number;

	constructor(value: number) {
		if (!Number.isFinite(value) || value < 0) {
			throw new ValidationError(
				"SongInstrumentStartTimeMs must be a non-negative finite number",
			);
		}

		this.value = value;
	}
}

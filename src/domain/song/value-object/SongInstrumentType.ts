export class SongInstrumentType {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new Error("SongInstrumentType cannot be empty");
		}

		this.value = value;
	}
}

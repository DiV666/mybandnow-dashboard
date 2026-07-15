export class SongInstrumentName {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new Error("SongInstrumentName cannot be empty");
		}

		this.value = value;
	}
}

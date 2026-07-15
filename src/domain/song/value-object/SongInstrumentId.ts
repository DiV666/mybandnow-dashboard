export class SongInstrumentId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new Error("SongInstrumentId cannot be empty");
		}

		this.value = value;
	}
}

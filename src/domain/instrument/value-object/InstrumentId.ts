export class InstrumentId {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new Error("InstrumentId cannot be empty");
		}

		this.value = value;
	}
}

export class MusicianId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new Error("MusicianId cannot be empty");
		}

		this.value = value;
	}
}

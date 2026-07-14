export class MusicianName {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new Error("MusicianName cannot be empty");
		}

		this.value = value;
	}
}

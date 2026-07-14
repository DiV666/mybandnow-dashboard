export class MusicianUsername {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new Error("MusicianUsername cannot be empty");
		}

		this.value = value;
	}
}

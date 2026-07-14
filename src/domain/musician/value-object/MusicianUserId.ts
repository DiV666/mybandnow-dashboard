export class MusicianUserId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new Error("MusicianUserId cannot be empty");
		}

		this.value = value;
	}
}

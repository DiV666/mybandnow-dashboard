export class SongId {
	readonly value: string;

	constructor(value: string) {
		if (!value) {
			throw new Error("SongId cannot be empty");
		}

		this.value = value;
	}
}

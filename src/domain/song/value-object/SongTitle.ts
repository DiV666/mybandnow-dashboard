export class SongTitle {
	readonly value: string;

	constructor(value: string) {
		if (!value.trim()) {
			throw new Error("SongTitle cannot be empty");
		}

		this.value = value;
	}
}

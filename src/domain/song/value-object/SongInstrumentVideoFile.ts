import { ValidationError } from "../../shared/ValidationError.js";

export class SongInstrumentVideoFile {
	readonly value: File;

	constructor(value: File) {
		if (value.size === 0) {
			throw new ValidationError("Video file cannot be empty");
		}

		if (!this.isMp4(value)) {
			throw new ValidationError("Video file must be an MP4");
		}

		this.value = value;
	}

	private isMp4(value: File): boolean {
		return (
			value.type === "video/mp4" || value.name.toLowerCase().endsWith(".mp4")
		);
	}
}

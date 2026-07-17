import { describe, expect, it } from "vitest";
import { SongInstrumentVideoFile } from "./SongInstrumentVideoFile.js";

describe("SongInstrumentVideoFile", () => {
	it("accepts MP4 files", () => {
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});

		const valueObject = new SongInstrumentVideoFile(videoFile);

		expect(valueObject.value).toBe(videoFile);
	});

	it("accepts MP4 filenames even when the browser omits the MIME type", () => {
		const videoFile = new File(["video-bytes"], "riff.mp4");

		const valueObject = new SongInstrumentVideoFile(videoFile);

		expect(valueObject.value).toBe(videoFile);
	});

	it("rejects empty files", () => {
		const videoFile = new File([], "riff.mp4", {
			type: "video/mp4",
		});

		expect(() => new SongInstrumentVideoFile(videoFile)).toThrow(
			"Video file cannot be empty",
		);
	});

	it("rejects non-MP4 files", () => {
		const videoFile = new File(["video-bytes"], "riff.webm", {
			type: "video/webm",
		});

		expect(() => new SongInstrumentVideoFile(videoFile)).toThrow(
			"Video file must be an MP4",
		);
	});
});

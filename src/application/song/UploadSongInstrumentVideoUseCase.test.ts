import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentVideoFile } from "../../domain/song/value-object/SongInstrumentVideoFile.js";
import { UploadSongInstrumentVideoUseCase } from "./UploadSongInstrumentVideoUseCase.js";

describe("UploadSongInstrumentVideoUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: UploadSongInstrumentVideoUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new UploadSongInstrumentVideoUseCase(repositoryMock);
	});

	it("uploads the original file after domain validation succeeds", async () => {
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});

		await useCase.run("song-123", "instrument-456", videoFile);

		expect(repositoryMock.uploadInstrumentVideo).toHaveBeenCalledTimes(1);
		expect(repositoryMock.uploadInstrumentVideo).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			new SongInstrumentVideoFile(videoFile),
		);
	});

	it("forwards different song instruments without reusing previous ids or files", async () => {
		const videoFile = new File(["other-video-bytes"], "solo.mp4", {
			type: "video/mp4",
		});

		await useCase.run("song-999", "instrument-888", videoFile);

		expect(repositoryMock.uploadInstrumentVideo).toHaveBeenCalledTimes(1);
		expect(repositoryMock.uploadInstrumentVideo).toHaveBeenCalledWith(
			new SongId("song-999"),
			new SongInstrumentId("instrument-888"),
			new SongInstrumentVideoFile(videoFile),
		);
	});

	it("rejects empty video files before reaching the repository", async () => {
		const videoFile = new File([], "riff.mp4", {
			type: "video/mp4",
		});

		await expect(
			useCase.run("song-123", "instrument-456", videoFile),
		).rejects.toThrow("Video file cannot be empty");
		expect(repositoryMock.uploadInstrumentVideo).not.toHaveBeenCalled();
	});

	it("accepts MP4 files even when the browser omits the MIME type", async () => {
		const videoFile = new File(["video-bytes"], "riff.mp4");

		await useCase.run("song-123", "instrument-456", videoFile);

		expect(repositoryMock.uploadInstrumentVideo).toHaveBeenCalledTimes(1);
		expect(repositoryMock.uploadInstrumentVideo).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			new SongInstrumentVideoFile(videoFile),
		);
	});

	it("rejects non-MP4 video files before reaching the repository", async () => {
		const videoFile = new File(["video-bytes"], "riff.webm", {
			type: "video/webm",
		});

		await expect(
			useCase.run("song-123", "instrument-456", videoFile),
		).rejects.toThrow("Video file must be an MP4");
		expect(repositoryMock.uploadInstrumentVideo).not.toHaveBeenCalled();
	});
});

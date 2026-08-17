import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { ConfirmSongInstrumentUploadUseCase } from "./ConfirmSongInstrumentUploadUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentUploadId } from "../../domain/song/value-object/SongInstrumentUploadId.js";

describe("ConfirmSongInstrumentUploadUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: ConfirmSongInstrumentUploadUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new ConfirmSongInstrumentUploadUseCase(repositoryMock);
	});

	it("should confirm the active upload attempt with the validated ids", async () => {
		repositoryMock.confirmInstrumentUpload.mockResolvedValue(undefined);

		await useCase.run("song-1", "instrument-1", "upload-1");

		expect(repositoryMock.confirmInstrumentUpload).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			new SongInstrumentUploadId("upload-1"),
		);
	});

	it("should fail before reaching the repository when the upload id is missing", async () => {
		await expect(useCase.run("song-1", "instrument-1", "")).rejects.toThrow(
			"SongInstrumentUploadId cannot be empty",
		);
		expect(repositoryMock.confirmInstrumentUpload).not.toHaveBeenCalled();
	});
});

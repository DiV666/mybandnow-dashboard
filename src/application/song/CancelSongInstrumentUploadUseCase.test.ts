import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { CancelSongInstrumentUploadUseCase } from "./CancelSongInstrumentUploadUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentUploadId } from "../../domain/song/value-object/SongInstrumentUploadId.js";

describe("CancelSongInstrumentUploadUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: CancelSongInstrumentUploadUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new CancelSongInstrumentUploadUseCase(repositoryMock);
	});

	it("should cancel the active upload attempt with the validated ids", async () => {
		repositoryMock.cancelInstrumentUpload.mockResolvedValue(undefined);

		await useCase.run("song-1", "instrument-1", "upload-1");

		expect(repositoryMock.cancelInstrumentUpload).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			new SongInstrumentUploadId("upload-1"),
		);
	});

	it("should fail before reaching the repository when the upload id is missing", async () => {
		await expect(useCase.run("song-1", "instrument-1", "")).rejects.toThrow(
			"SongInstrumentUploadId cannot be empty",
		);
		expect(repositoryMock.cancelInstrumentUpload).not.toHaveBeenCalled();
	});
});

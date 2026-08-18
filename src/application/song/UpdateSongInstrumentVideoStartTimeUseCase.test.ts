import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { UpdateSongInstrumentVideoStartTimeUseCase } from "./UpdateSongInstrumentVideoStartTimeUseCase";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";

describe("UpdateSongInstrumentVideoStartTimeUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: UpdateSongInstrumentVideoStartTimeUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new UpdateSongInstrumentVideoStartTimeUseCase(repositoryMock);
	});

	it("should update the instrument video start time with the validated values", async () => {
		repositoryMock.updateInstrumentVideoStartTime.mockResolvedValue(undefined);

		await useCase.run("song-1", "instrument-1", 1500);

		expect(repositoryMock.updateInstrumentVideoStartTime).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			{ startTimeMs: 1500 },
		);
	});

	it("should fail before reaching the repository when the song id is missing", async () => {
		await expect(
			useCase.run("", "instrument-1", 1500),
		).rejects.toThrow("SongId cannot be empty");
		expect(repositoryMock.updateInstrumentVideoStartTime).not.toHaveBeenCalled();
	});

	it("should update the instrument video start time when startTimeMs is negative", async () => {
		repositoryMock.updateInstrumentVideoStartTime.mockResolvedValue(undefined);

		await useCase.run("song-1", "instrument-1", -1500);

		expect(repositoryMock.updateInstrumentVideoStartTime).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			{ startTimeMs: -1500 },
		);
	});

	it("should fail before reaching the repository when startTimeMs is not finite", async () => {
		await expect(
			useCase.run("song-1", "instrument-1", Number.NaN),
		).rejects.toThrow("SongInstrumentStartTimeMs must be a finite number");
		expect(repositoryMock.updateInstrumentVideoStartTime).not.toHaveBeenCalled();
	});
});

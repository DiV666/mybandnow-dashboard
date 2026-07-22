import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { UpdateSongInstrumentUseCase } from "./UpdateSongInstrumentUseCase";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";

describe("UpdateSongInstrumentUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: UpdateSongInstrumentUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new UpdateSongInstrumentUseCase(repositoryMock);
	});

	it("should update the selected song instrument with validated values", async () => {
		const updatedInstrument = {
			id: "instrument-1",
			name: "Guitarra acústica",
			instrumentId: "catalog-2",
			songId: "song-1",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			video: null,
			upload: null,
		};
		repositoryMock.updateInstrument.mockResolvedValue(updatedInstrument);

		const result = await useCase.run(
			"song-1",
			"instrument-1",
			"Guitarra acústica",
			"catalog-2",
		);

		expect(repositoryMock.updateInstrument).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			{
				name: "Guitarra acústica",
				instrumentId: "catalog-2",
			},
		);
		expect(result).toEqual(updatedInstrument);
	});

	it("should fail before reaching the repository when the selected catalog instrument is missing", async () => {
		await expect(
			useCase.run("song-1", "instrument-1", "Guitarra acústica", ""),
		).rejects.toThrow("InstrumentId cannot be empty");
		expect(repositoryMock.updateInstrument).not.toHaveBeenCalled();
	});
});

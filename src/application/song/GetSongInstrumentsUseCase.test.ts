import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { GetSongInstrumentsUseCase } from "./GetSongInstrumentsUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import type { SongInstrumentListItemResponse } from "../../domain/song/SongInstrumentResponse.js";
import { SongId } from "../../domain/song/value-object/SongId.js";

describe("GetSongInstrumentsUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: GetSongInstrumentsUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetSongInstrumentsUseCase(repositoryMock);
	});

	it("should return the instruments for the selected song", async () => {
		const instruments: SongInstrumentListItemResponse[] = [
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-123",
				musicianId: "musician-123",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: {
					status: "READY",
				},
			},
		];
		repositoryMock.getInstrumentsBySongId.mockResolvedValue(instruments);

		const result = await useCase.run("song-123");

		expect(repositoryMock.getInstrumentsBySongId).toHaveBeenCalledWith(
			new SongId("song-123"),
		);
		expect(result).toEqual(instruments);
	});

	it("should return an empty array when the selected song has no instruments", async () => {
		repositoryMock.getInstrumentsBySongId.mockResolvedValue([]);

		const result = await useCase.run("song-empty");

		expect(repositoryMock.getInstrumentsBySongId).toHaveBeenCalledWith(
			new SongId("song-empty"),
		);
		expect(result).toEqual([]);
	});
});

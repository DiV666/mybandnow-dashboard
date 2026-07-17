import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { GetSongInstrumentDetailUseCase } from "./GetSongInstrumentDetailUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import type { SongInstrumentDetailResponse } from "../../domain/song/SongInstrumentResponse.js";

describe("GetSongInstrumentDetailUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: GetSongInstrumentDetailUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetSongInstrumentDetailUseCase(repositoryMock);
	});

	it("should return the instrument detail for the selected song instrument", async () => {
		const instrument: SongInstrumentDetailResponse = {
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentType: "electric-guitar",
			songId: "song-123",
			musicianId: "musician-123",
			createdAt: "2026-07-15T10:00:00.000Z",
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/video-1.mp4",
				duration: 123,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: {
				status: "COMPLETED",
			},
		};
		repositoryMock.getInstrumentById.mockResolvedValue(instrument);

		const result = await useCase.run("song-123", "instrument-1");

		expect(repositoryMock.getInstrumentById).toHaveBeenCalledWith(
			"song-123",
			"instrument-1",
		);
		expect(result).toEqual(instrument);
	});

	it("should return failed upload details so the UI can enable retry", async () => {
		const instrument: SongInstrumentDetailResponse = {
			id: "instrument-2",
			name: "Batería",
			instrumentType: "drums",
			songId: "song-123",
			musicianId: "musician-456",
			createdAt: "2026-07-15T10:05:00.000Z",
			video: null,
			upload: {
				status: "FAILED",
				errorMessage:
					"Only the assigned musician can upload for this song instrument.",
			},
		};
		repositoryMock.getInstrumentById.mockResolvedValue(instrument);

		const result = await useCase.run("song-123", "instrument-2");

		expect(repositoryMock.getInstrumentById).toHaveBeenCalledWith(
			"song-123",
			"instrument-2",
		);
		expect(result).toEqual(instrument);
	});
});

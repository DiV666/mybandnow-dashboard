import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { GetBandSongsUseCase } from "./GetBandSongsUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import type { SongResponse } from "../../domain/song/SongResponse.js";

describe("GetBandSongsUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: GetBandSongsUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetBandSongsUseCase(repositoryMock);
	});

	it("should return the songs for the selected band", async () => {
		const songs: SongResponse[] = [
			{
				id: "song-1",
				bandId: "band-123",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		];
		repositoryMock.getByBandId.mockResolvedValue(songs);

		const result = await useCase.run("band-123");

		expect(repositoryMock.getByBandId).toHaveBeenCalledWith("band-123");
		expect(result).toEqual(songs);
	});

	it("should return an empty array when the selected band has no songs", async () => {
		repositoryMock.getByBandId.mockResolvedValue([]);

		const result = await useCase.run("band-empty");

		expect(repositoryMock.getByBandId).toHaveBeenCalledWith("band-empty");
		expect(result).toEqual([]);
	});
});

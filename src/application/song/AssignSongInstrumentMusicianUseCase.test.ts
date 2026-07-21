import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { AssignSongInstrumentMusicianUseCase } from "./AssignSongInstrumentMusicianUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";

describe("AssignSongInstrumentMusicianUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: AssignSongInstrumentMusicianUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new AssignSongInstrumentMusicianUseCase(repositoryMock);
	});

	it("should assign a musician id to the selected song instrument", async () => {
		repositoryMock.assignMusician.mockResolvedValue(undefined);

		await useCase.run("song-123", "instrument-456", "musician-789");

		expect(repositoryMock.assignMusician).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			new MusicianId("musician-789"),
		);
	});

	it("should fail when the musician id is empty", async () => {
		await expect(useCase.run("song-123", "instrument-456", "")).rejects.toThrow(
			"MusicianId cannot be empty",
		);
		expect(repositoryMock.assignMusician).not.toHaveBeenCalled();
	});
});

import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { AssignSongInstrumentMusicianUseCase } from "./AssignSongInstrumentMusicianUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";

describe("AssignSongInstrumentMusicianUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: AssignSongInstrumentMusicianUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new AssignSongInstrumentMusicianUseCase(repositoryMock);
	});

	it("should assign a musician email to the selected song instrument", async () => {
		repositoryMock.assignMusician.mockResolvedValue(undefined);

		await useCase.run("song-123", "instrument-456", "artist@example.com");

		expect(repositoryMock.assignMusician).toHaveBeenCalledWith(
			"song-123",
			"instrument-456",
			new MusicianEmail("artist@example.com"),
		);
	});

	it("should fail when the musician email is invalid", async () => {
		await expect(
			useCase.run("song-123", "instrument-456", "invalid-email"),
		).rejects.toThrow("MusicianEmail must be a valid email");
		expect(repositoryMock.assignMusician).not.toHaveBeenCalled();
	});
});

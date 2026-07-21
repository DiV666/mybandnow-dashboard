import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";
import { InviteSongInstrumentMusicianUseCase } from "./InviteSongInstrumentMusicianUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";

describe("InviteSongInstrumentMusicianUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: InviteSongInstrumentMusicianUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new InviteSongInstrumentMusicianUseCase(repositoryMock);
	});

	it("should invite a musician by email for the selected song instrument", async () => {
		repositoryMock.inviteMusician.mockResolvedValue(undefined);

		await useCase.run("song-123", "instrument-456", "player@example.com");

		expect(repositoryMock.inviteMusician).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			new MusicianEmail("player@example.com"),
		);
	});

	it("should fail when the musician email is not valid", async () => {
		await expect(
			useCase.run("song-123", "instrument-456", "invalid-email"),
		).rejects.toThrow("MusicianEmail must be a valid email");
		expect(repositoryMock.inviteMusician).not.toHaveBeenCalled();
	});
});

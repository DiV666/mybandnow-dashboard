import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { CreateSongInstrumentUseCase } from "./CreateSongInstrumentUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentName } from "../../domain/song/value-object/SongInstrumentName.js";
import { SongInstrumentType } from "../../domain/song/value-object/SongInstrumentType.js";

describe("CreateSongInstrumentUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: CreateSongInstrumentUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new CreateSongInstrumentUseCase(repositoryMock);
	});

	it("should create a song instrument using validated value objects", async () => {
		await useCase.run(
			"song-123",
			"11111111-1111-4111-8111-111111111111",
			"Guitarra principal",
			"electric-guitar",
			"22222222-2222-4222-8222-222222222222",
		);

		expect(repositoryMock.saveInstrument).toHaveBeenCalledTimes(1);
		expect(repositoryMock.saveInstrument.mock.calls[0][0]).toBe("song-123");
		const savedInstrument = repositoryMock.saveInstrument.mock.calls[0][1];

		expect(savedInstrument.id.value).toBe(
			new SongInstrumentId("11111111-1111-4111-8111-111111111111").value,
		);
		expect(savedInstrument.name.value).toBe(
			new SongInstrumentName("Guitarra principal").value,
		);
		expect(savedInstrument.instrumentType.value).toBe(
			new SongInstrumentType("electric-guitar").value,
		);
		expect(savedInstrument.musicianId.value).toBe(
			new MusicianId("22222222-2222-4222-8222-222222222222").value,
		);
	});

	it("should fail before reaching the repository when the instrument name is invalid", async () => {
		await expect(
			useCase.run(
				"song-123",
				"11111111-1111-4111-8111-111111111111",
				"",
				"electric-guitar",
				"22222222-2222-4222-8222-222222222222",
			),
		).rejects.toThrow("SongInstrumentName cannot be empty");
		expect(repositoryMock.saveInstrument).not.toHaveBeenCalled();
	});

	it("should fail before reaching the repository when the instrument type is invalid", async () => {
		await expect(
			useCase.run(
				"song-123",
				"11111111-1111-4111-8111-111111111111",
				"Guitarra principal",
				"",
				"22222222-2222-4222-8222-222222222222",
			),
		).rejects.toThrow("SongInstrumentType cannot be empty");
		expect(repositoryMock.saveInstrument).not.toHaveBeenCalled();
	});
});

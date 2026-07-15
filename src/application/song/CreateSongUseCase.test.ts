import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { CreateSongUseCase } from "./CreateSongUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongOriginalVideoclipUrl } from "../../domain/song/value-object/SongOriginalVideoclipUrl.js";
import { SongTitle } from "../../domain/song/value-object/SongTitle.js";

describe("CreateSongUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: CreateSongUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new CreateSongUseCase(repositoryMock);
	});

	it("should create a song for the selected band using validated value objects", async () => {
		const bandId = "band-123";
		const songId = "11111111-1111-4111-8111-111111111111";
		const title = "Paint It Black";
		const originalVideoclipUrl = "https://www.youtube.com/watch?v=O4irXQhgMqg";

		await useCase.run(bandId, songId, title, originalVideoclipUrl);

		expect(repositoryMock.save).toHaveBeenCalledTimes(1);
		expect(repositoryMock.save.mock.calls[0][0]).toBe(bandId);
		const savedSong = repositoryMock.save.mock.calls[0][1];

		expect(savedSong.id.value).toBe(new SongId(songId).value);
		expect(savedSong.title.value).toBe(new SongTitle(title).value);
		expect(savedSong.originalVideoclipUrl.value).toBe(
			new SongOriginalVideoclipUrl(originalVideoclipUrl).value,
		);
	});

	it("should fail before reaching the repository when the title is invalid", async () => {
		await expect(
			useCase.run(
				"band-123",
				"11111111-1111-4111-8111-111111111111",
				"",
				"https://www.youtube.com/watch?v=O4irXQhgMqg",
			),
		).rejects.toThrow("SongTitle cannot be empty");
		expect(repositoryMock.save).not.toHaveBeenCalled();
	});

	it("should fail before reaching the repository when the videoclip URL is invalid", async () => {
		await expect(
			useCase.run(
				"band-123",
				"11111111-1111-4111-8111-111111111111",
				"Paint It Black",
				"not-a-valid-url",
			),
		).rejects.toThrow("SongOriginalVideoclipUrl must be a valid URL");
		expect(repositoryMock.save).not.toHaveBeenCalled();
	});
});

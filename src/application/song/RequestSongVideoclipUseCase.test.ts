import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { RequestSongVideoclipUseCase } from "./RequestSongVideoclipUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongVideoclipId } from "../../domain/song/value-object/SongVideoclipId.js";

describe("RequestSongVideoclipUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: RequestSongVideoclipUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new RequestSongVideoclipUseCase(repositoryMock);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should request the videoclip generation with a client-generated id", async () => {
		repositoryMock.requestVideoclipGeneration.mockResolvedValue();
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			"11111111-1111-4111-8111-111111111111",
		);

		await useCase.run("song-123");

		expect(repositoryMock.requestVideoclipGeneration).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongVideoclipId("11111111-1111-4111-8111-111111111111"),
		);
	});

	it("should fail before reaching the repository when the song id is invalid", async () => {
		await expect(useCase.run("")).rejects.toThrow("SongId cannot be empty");
		expect(repositoryMock.requestVideoclipGeneration).not.toHaveBeenCalled();
	});
});

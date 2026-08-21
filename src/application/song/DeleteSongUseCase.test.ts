import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { DeleteSongUseCase } from "./DeleteSongUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";

describe("DeleteSongUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: DeleteSongUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new DeleteSongUseCase(repositoryMock);
	});

	it("should delete the selected song", async () => {
		repositoryMock.deleteSong.mockResolvedValue(undefined);

		await useCase.run("song-123");

		expect(repositoryMock.deleteSong).toHaveBeenCalledWith(new SongId("song-123"));
	});

	it("should fail when the song id is empty", async () => {
		await expect(useCase.run("")).rejects.toThrow("SongId cannot be empty");
		expect(repositoryMock.deleteSong).not.toHaveBeenCalled();
	});
});

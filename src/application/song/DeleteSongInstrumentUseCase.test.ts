import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { DeleteSongInstrumentUseCase } from "./DeleteSongInstrumentUseCase.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";

describe("DeleteSongInstrumentUseCase", () => {
	const repositoryMock = mock<SongRepository>();
	let useCase: DeleteSongInstrumentUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new DeleteSongInstrumentUseCase(repositoryMock);
	});

	it("should delete the selected song instrument", async () => {
		repositoryMock.deleteInstrument.mockResolvedValue(undefined);

		await useCase.run("song-123", "instrument-456");

		expect(repositoryMock.deleteInstrument).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
		);
	});

	it("should fail when the instrument id is empty", async () => {
		await expect(useCase.run("song-123", "")).rejects.toThrow(
			"SongInstrumentId cannot be empty",
		);
		expect(repositoryMock.deleteInstrument).not.toHaveBeenCalled();
	});
});

import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { GetMusicianByIdUseCase } from "./GetMusicianByIdUseCase.js";
import type { MusicianRepository } from "../../domain/musician/repository/MusicianRepository.js";

describe("GetMusicianByIdUseCase", () => {
	const repositoryMock = mock<MusicianRepository>();
	let useCase: GetMusicianByIdUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetMusicianByIdUseCase(repositoryMock);
	});

	it("should return the musician public data by id", async () => {
		repositoryMock.getById.mockResolvedValue({
			id: "musician-1",
			name: "John Frusciante",
			username: "johnny",
		});

		const result = await useCase.run("musician-1");

		expect(repositoryMock.getById).toHaveBeenCalledWith("musician-1");
		expect(result).toEqual({
			id: "musician-1",
			name: "John Frusciante",
			username: "johnny",
		});
	});

	it("should return null when the musician does not exist", async () => {
		repositoryMock.getById.mockResolvedValue(null);

		const result = await useCase.run("missing-musician");

		expect(result).toBeNull();
	});
});

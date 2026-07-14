import { describe, it, expect, beforeEach } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { GetMyProfileUseCase } from "./GetMyProfileUseCase.js";
import type { MusicianRepository } from "../../domain/musician/repository/MusicianRepository.js";
import { Musician } from "../../domain/musician/Musician.js";

describe("GetMyProfileUseCase", () => {
	const repositoryMock = mock<MusicianRepository>();
	let useCase: GetMyProfileUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetMyProfileUseCase(repositoryMock);
	});

	it("should return the authenticated musician profile", async () => {
		const expectedMusician = Musician.fromPrimitives({
			id: "123",
			userId: "user-123",
			username: "jimi",
			name: "Jimi Hendrix",
		});
		repositoryMock.getProfile.mockResolvedValue(expectedMusician);

		const result = await useCase.run();

		expect(repositoryMock.getProfile).toHaveBeenCalledOnce();
		expect(result).toBe(expectedMusician);
	});

	it("should return null if the profile does not exist", async () => {
		repositoryMock.getProfile.mockResolvedValue(null);

		const result = await useCase.run();

		expect(result).toBeNull();
	});
});

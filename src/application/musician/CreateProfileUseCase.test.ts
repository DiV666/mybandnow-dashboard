import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { CreateProfileUseCase } from "./CreateProfileUseCase.js";
import type { MusicianRepository } from "../../domain/musician/repository/MusicianRepository.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { MusicianName } from "../../domain/musician/value-object/MusicianName.js";
import { MusicianUsername } from "../../domain/musician/value-object/MusicianUsername.js";

describe("CreateProfileUseCase", () => {
	const repositoryMock = mock<MusicianRepository>();
	let useCase: CreateProfileUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new CreateProfileUseCase(repositoryMock);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should create the profile via the repository with validated value objects", async () => {
		repositoryMock.createProfile.mockResolvedValue();
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			"11111111-1111-4111-8111-111111111111",
		);

		await useCase.run("Jimi Hendrix", "jimi_hendrix");

		expect(repositoryMock.createProfile).toHaveBeenCalledWith(
			new MusicianId("11111111-1111-4111-8111-111111111111"),
			new MusicianName("Jimi Hendrix"),
			new MusicianUsername("jimi_hendrix"),
		);
	});

	it("should fail before reaching the repository when the name is invalid", async () => {
		await expect(useCase.run("", "jimi_hendrix")).rejects.toThrow(
			"MusicianName cannot be empty",
		);
		expect(repositoryMock.createProfile).not.toHaveBeenCalled();
	});
});

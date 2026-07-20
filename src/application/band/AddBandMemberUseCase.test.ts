import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { AddBandMemberUseCase } from "./AddBandMemberUseCase.js";
import type { BandRepository } from "../../domain/band/repository/BandRepository.js";
import { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";

describe("AddBandMemberUseCase", () => {
	const repositoryMock = mock<BandRepository>();
	let useCase: AddBandMemberUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new AddBandMemberUseCase(repositoryMock);
	});

	it("should add a member to the selected band using the musician email", async () => {
		await useCase.run("band-1", "artist@example.com");

		expect(repositoryMock.addMember).toHaveBeenCalledWith(
			"band-1",
			new MusicianEmail("artist@example.com"),
		);
	});

	it("should fail when the musician email is invalid", async () => {
		await expect(useCase.run("band-1", "invalid-email")).rejects.toThrow(
			"MusicianEmail must be a valid email",
		);
		expect(repositoryMock.addMember).not.toHaveBeenCalled();
	});

	it("should propagate repository errors when adding a member fails", async () => {
		const expectedError = new Error("boom");
		repositoryMock.addMember.mockRejectedValue(expectedError);

		await expect(useCase.run("band-2", "other@example.com")).rejects.toThrow(
			expectedError,
		);
	});
});

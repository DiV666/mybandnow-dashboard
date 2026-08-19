import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { RemoveBandMemberUseCase } from "./RemoveBandMemberUseCase.js";
import type { BandRepository } from "../../domain/band/repository/BandRepository.js";

describe("RemoveBandMemberUseCase", () => {
	const repositoryMock = mock<BandRepository>();
	let useCase: RemoveBandMemberUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new RemoveBandMemberUseCase(repositoryMock);
	});

	it("should remove a member from the band", async () => {
		await useCase.run("band-1", "musician-1");

		expect(repositoryMock.removeMember).toHaveBeenCalledWith(
			"band-1",
			"musician-1",
		);
	});

	it("should propagate repository errors when removing a member fails", async () => {
		const expectedError = new Error("boom");
		repositoryMock.removeMember.mockRejectedValue(expectedError);

		await expect(useCase.run("band-2", "musician-2")).rejects.toThrow(
			expectedError,
		);
	});
});

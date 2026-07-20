import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { GetBandMembersUseCase } from "./GetBandMembersUseCase.js";
import type { BandRepository } from "../../domain/band/repository/BandRepository.js";

describe("GetBandMembersUseCase", () => {
	const repositoryMock = mock<BandRepository>();
	let useCase: GetBandMembersUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetBandMembersUseCase(repositoryMock);
	});

	it("should return the members of the selected band", async () => {
		repositoryMock.getMembers.mockResolvedValue([
			{ musicianId: "musician-1", role: "ADMIN" },
			{ musicianId: "musician-2", role: "MEMBER" },
		]);

		const result = await useCase.run("band-123");

		expect(repositoryMock.getMembers).toHaveBeenCalledWith("band-123");
		expect(result).toEqual([
			{ musicianId: "musician-1", role: "ADMIN" },
			{ musicianId: "musician-2", role: "MEMBER" },
		]);
	});

	it("should return an empty list when the band has no members", async () => {
		repositoryMock.getMembers.mockResolvedValue([]);

		const result = await useCase.run("band-empty");

		expect(result).toEqual([]);
	});
});

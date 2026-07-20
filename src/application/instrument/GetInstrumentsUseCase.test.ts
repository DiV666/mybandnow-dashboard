import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { GetInstrumentsUseCase } from "./GetInstrumentsUseCase.js";
import type { InstrumentRepository } from "../../domain/instrument/repository/InstrumentRepository.js";

describe("GetInstrumentsUseCase", () => {
	const repositoryMock = mock<InstrumentRepository>();
	let useCase: GetInstrumentsUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetInstrumentsUseCase(repositoryMock);
	});

	it("should return the available instrument catalog", async () => {
		const instruments = [
			{
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		];
		repositoryMock.getAll.mockResolvedValue(instruments);

		const result = await useCase.run();

		expect(repositoryMock.getAll).toHaveBeenCalledTimes(1);
		expect(result).toEqual(instruments);
	});
});

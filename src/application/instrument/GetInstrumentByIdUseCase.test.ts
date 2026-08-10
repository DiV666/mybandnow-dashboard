import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { GetInstrumentByIdUseCase } from "./GetInstrumentByIdUseCase.js";
import type { InstrumentRepository } from "../../domain/instrument/repository/InstrumentRepository.js";
import { Instrument } from "../../domain/instrument/Instrument.js";

describe("GetInstrumentByIdUseCase", () => {
	const repositoryMock = mock<InstrumentRepository>();
	let useCase: GetInstrumentByIdUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetInstrumentByIdUseCase(repositoryMock);
	});

	it("should return the selected instrument from the catalog", async () => {
		const instrument = Instrument.fromPrimitives({
			id: "catalog-1",
			name: "Electric Guitar",
			description: "Amplified guitar",
			createdAt: "2026-07-15T10:00:00.000Z",
		});
		repositoryMock.getById.mockResolvedValue(instrument);

		const result = await useCase.run("catalog-1");

		expect(repositoryMock.getById).toHaveBeenCalledWith("catalog-1");
		expect(result).toEqual(instrument);
	});
});

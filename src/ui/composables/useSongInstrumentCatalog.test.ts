import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { useSongInstrumentCatalog } from "./useSongInstrumentCatalog.js";
import { GetInstrumentsUseCase } from "../../application/instrument/GetInstrumentsUseCase.js";
import { GetInstrumentByIdUseCase } from "../../application/instrument/GetInstrumentByIdUseCase.js";
import { Instrument } from "../../domain/instrument/Instrument.js";

describe("useSongInstrumentCatalog", () => {
	const getInstrumentsUseCase = mock<GetInstrumentsUseCase>();
	const getInstrumentByIdUseCase = mock<GetInstrumentByIdUseCase>();

	beforeEach(() => {
		mockReset(getInstrumentsUseCase);
		mockReset(getInstrumentByIdUseCase);
	});

	function createCatalog() {
		return useSongInstrumentCatalog({
			getInstrumentsUseCase,
			getInstrumentByIdUseCase,
		});
	}

	it("populates availableInstruments after a successful load", async () => {
		const instruments = [
			Instrument.fromPrimitives({
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T10:00:00.000Z",
			}),
		];
		getInstrumentsUseCase.run.mockResolvedValue(instruments);

		const { availableInstruments, ensureAvailableInstrumentsLoaded } = createCatalog();
		await ensureAvailableInstrumentsLoaded();

		expect(availableInstruments.value).toEqual(instruments);
	});

	it("deduplicates concurrent calls to ensureAvailableInstrumentsLoaded into a single request", async () => {
		let resolveRun: (instruments: Instrument[]) => void = () => {};
		getInstrumentsUseCase.run.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRun = resolve;
				}),
		);

		const { ensureAvailableInstrumentsLoaded } = createCatalog();
		const first = ensureAvailableInstrumentsLoaded();
		const second = ensureAvailableInstrumentsLoaded();

		resolveRun([]);
		await Promise.all([first, second]);

		expect(getInstrumentsUseCase.run).toHaveBeenCalledTimes(1);
	});

	it("does not re-fetch the catalog once availableInstruments already has entries", async () => {
		const instruments = [
			Instrument.fromPrimitives({
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T10:00:00.000Z",
			}),
		];
		getInstrumentsUseCase.run.mockResolvedValue(instruments);

		const { ensureAvailableInstrumentsLoaded } = createCatalog();
		await ensureAvailableInstrumentsLoaded();
		await ensureAvailableInstrumentsLoaded();

		expect(getInstrumentsUseCase.run).toHaveBeenCalledTimes(1);
	});

	it("deduplicates concurrent calls to ensureCatalogInstrumentNameLoaded for the same instrument", async () => {
		let resolveRun: (instrument: Instrument) => void = () => {};
		getInstrumentByIdUseCase.run.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRun = resolve;
				}),
		);

		const { ensureCatalogInstrumentNameLoaded } = createCatalog();
		const first = ensureCatalogInstrumentNameLoaded("catalog-1");
		const second = ensureCatalogInstrumentNameLoaded("catalog-1");

		resolveRun(
			Instrument.fromPrimitives({
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T10:00:00.000Z",
			}),
		);
		await Promise.all([first, second]);

		expect(getInstrumentByIdUseCase.run).toHaveBeenCalledTimes(1);
	});

	it("falls back to the raw instrument id before the name has loaded", () => {
		const { getCatalogInstrumentName } = createCatalog();

		expect(getCatalogInstrumentName("catalog-1")).toBe("catalog-1");
	});

	it("resolves the catalog id from either the song instrument list item or detail response", () => {
		const { getSongInstrumentCatalogId } = createCatalog();

		expect(
			getSongInstrumentCatalogId({ instrumentId: "catalog-1", instrumentType: "guitar" } as never),
		).toBe("catalog-1");
		expect(
			getSongInstrumentCatalogId({ instrumentId: undefined, instrumentType: "guitar" } as never),
		).toBe("guitar");
	});
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosInstrumentRepository } from "./AxiosInstrumentRepository.js";
import { httpClient } from "../http/httpClient.js";

describe("AxiosInstrumentRepository", () => {
	const repository = new AxiosInstrumentRepository();

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return the available instrument catalog", async () => {
		const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue({
			data: {
				items: [
					{
						id: "catalog-1",
						name: "Electric Guitar",
						description: "Amplified guitar",
						createdAt: "2026-07-15T10:00:00.000Z",
					},
				],
				total: 1,
			},
		} as never);

		const instruments = await repository.getAll();

		expect(getSpy).toHaveBeenCalledWith("/v1/instruments");
		expect(instruments).toEqual([
			{
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
	});

	it("should return the selected instrument catalog detail", async () => {
		const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue({
			data: {
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		} as never);

		const instrument = await repository.getById("catalog-1");

		expect(getSpy).toHaveBeenCalledWith("/v1/instruments/catalog-1");
		expect(instrument).toEqual({
			id: "catalog-1",
			name: "Electric Guitar",
			description: "Amplified guitar",
			createdAt: "2026-07-15T10:00:00.000Z",
		});
	});
});

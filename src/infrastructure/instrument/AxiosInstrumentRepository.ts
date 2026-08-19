import { httpClient } from "../http/httpClient.js";
import {
	Instrument,
	type InstrumentPrimitives,
} from "../../domain/instrument/Instrument.js";
import type { InstrumentRepository } from "../../domain/instrument/repository/InstrumentRepository.js";

export class AxiosInstrumentRepository implements InstrumentRepository {
	async getAll(): Promise<Instrument[]> {
		const response = await httpClient.get<{
			items: InstrumentPrimitives[];
			total: number;
		}>("/v1/instruments", {
			params: { criteria: JSON.stringify({ limit: 100 }) },
		});

		return response.data.items.map(Instrument.fromPrimitives);
	}

	async getById(instrumentId: string): Promise<Instrument> {
		const response = await httpClient.get<InstrumentPrimitives>(
			`/v1/instruments/${instrumentId}`,
		);

		return Instrument.fromPrimitives(response.data);
	}
}

import { httpClient } from "../http/httpClient.js";
import type {
	InstrumentCollectionResponse,
	InstrumentResponse,
} from "../../domain/instrument/InstrumentResponse.js";
import type { InstrumentRepository } from "../../domain/instrument/repository/InstrumentRepository.js";

export class AxiosInstrumentRepository implements InstrumentRepository {
	async getAll(): Promise<InstrumentResponse[]> {
		const response =
			await httpClient.get<InstrumentCollectionResponse>("/v1/instruments");

		return response.data.items;
	}

	async getById(instrumentId: string): Promise<InstrumentResponse> {
		const response = await httpClient.get<InstrumentResponse>(
			`/v1/instruments/${instrumentId}`,
		);

		return response.data;
	}
}

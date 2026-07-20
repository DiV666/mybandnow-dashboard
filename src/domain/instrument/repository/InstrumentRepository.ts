import type { InstrumentResponse } from "../InstrumentResponse.js";

export interface InstrumentRepository {
	getAll(): Promise<InstrumentResponse[]>;
	getById(instrumentId: string): Promise<InstrumentResponse>;
}

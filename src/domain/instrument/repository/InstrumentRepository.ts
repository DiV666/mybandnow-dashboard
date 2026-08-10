import type { Instrument } from "../Instrument.js";

export interface InstrumentRepository {
	getAll(): Promise<Instrument[]>;
	getById(instrumentId: string): Promise<Instrument>;
}

import type { Instrument } from "../../domain/instrument/Instrument.js";
import type { InstrumentRepository } from "../../domain/instrument/repository/InstrumentRepository.js";

export class GetInstrumentByIdUseCase {
	private readonly repository: InstrumentRepository;

	constructor(repository: InstrumentRepository) {
		this.repository = repository;
	}

	async run(instrumentId: string): Promise<Instrument> {
		return this.repository.getById(instrumentId);
	}
}

import type { Instrument } from "../../domain/instrument/Instrument.js";
import type { InstrumentRepository } from "../../domain/instrument/repository/InstrumentRepository.js";

export class GetInstrumentsUseCase {
	private readonly repository: InstrumentRepository;

	constructor(repository: InstrumentRepository) {
		this.repository = repository;
	}

	async run(): Promise<Instrument[]> {
		return this.repository.getAll();
	}
}

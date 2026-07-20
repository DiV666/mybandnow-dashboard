import type { InstrumentResponse } from "../../domain/instrument/InstrumentResponse.js";
import type { InstrumentRepository } from "../../domain/instrument/repository/InstrumentRepository.js";

export class GetInstrumentsUseCase {
	private readonly repository: InstrumentRepository;

	constructor(repository: InstrumentRepository) {
		this.repository = repository;
	}

	async run(): Promise<InstrumentResponse[]> {
		return this.repository.getAll();
	}
}

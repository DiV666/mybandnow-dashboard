import type { InstrumentResponse } from "../../domain/instrument/InstrumentResponse.js";
import type { InstrumentRepository } from "../../domain/instrument/repository/InstrumentRepository.js";

export class GetInstrumentByIdUseCase {
	private readonly repository: InstrumentRepository;

	constructor(repository: InstrumentRepository) {
		this.repository = repository;
	}

	async run(instrumentId: string): Promise<InstrumentResponse> {
		return this.repository.getById(instrumentId);
	}
}

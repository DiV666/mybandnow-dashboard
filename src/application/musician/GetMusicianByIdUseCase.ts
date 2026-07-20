import type { MusicianSummaryResponse } from "../../domain/musician/MusicianSummaryResponse.js";
import type { MusicianRepository } from "../../domain/musician/repository/MusicianRepository.js";

export class GetMusicianByIdUseCase {
	private readonly repository: MusicianRepository;

	constructor(repository: MusicianRepository) {
		this.repository = repository;
	}

	async run(id: string): Promise<MusicianSummaryResponse | null> {
		return this.repository.getById(id);
	}
}

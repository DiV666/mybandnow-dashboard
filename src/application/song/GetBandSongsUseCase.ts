import type { SongResponse } from "../../domain/song/SongResponse.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";

export class GetBandSongsUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(bandId: string): Promise<SongResponse[]> {
		return this.repository.getByBandId(bandId);
	}
}

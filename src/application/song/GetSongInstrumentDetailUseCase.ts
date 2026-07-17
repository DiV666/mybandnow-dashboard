import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import type { SongInstrumentDetailResponse } from "../../domain/song/SongInstrumentResponse.js";

export class GetSongInstrumentDetailUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		songId: string,
		instrumentId: string,
	): Promise<SongInstrumentDetailResponse> {
		return this.repository.getInstrumentById(songId, instrumentId);
	}
}

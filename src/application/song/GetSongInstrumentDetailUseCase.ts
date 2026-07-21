import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import type { SongInstrumentDetailResponse } from "../../domain/song/SongInstrumentResponse.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";

export class GetSongInstrumentDetailUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		songId: string,
		instrumentId: string,
	): Promise<SongInstrumentDetailResponse> {
		return this.repository.getInstrumentById(
			new SongId(songId),
			new SongInstrumentId(instrumentId),
		);
	}
}

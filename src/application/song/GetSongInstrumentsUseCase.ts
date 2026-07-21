import type { SongInstrumentListItemResponse } from "../../domain/song/SongInstrumentResponse.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";

export class GetSongInstrumentsUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(songId: string): Promise<SongInstrumentListItemResponse[]> {
		return this.repository.getInstrumentsBySongId(new SongId(songId));
	}
}

import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";

export class DeleteSongInstrumentUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(songId: string, instrumentId: string): Promise<void> {
		await this.repository.deleteInstrument(
			new SongId(songId),
			new SongInstrumentId(instrumentId),
		);
	}
}

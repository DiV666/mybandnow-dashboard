import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentStartTimeMs } from "../../domain/song/value-object/SongInstrumentStartTimeMs.js";

export class UpdateSongInstrumentVideoStartTimeUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(songId: string, instrumentId: string, startTimeMs: number): Promise<void> {
		await this.repository.updateInstrumentVideoStartTime(
			new SongId(songId),
			new SongInstrumentId(instrumentId),
			{ startTimeMs: new SongInstrumentStartTimeMs(startTimeMs).value },
		);
	}
}

import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";

export class AssignSongInstrumentMusicianUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		songId: string,
		instrumentId: string,
		musicianId: string,
	): Promise<void> {
		await this.repository.assignMusician(
			new SongId(songId),
			new SongInstrumentId(instrumentId),
			new MusicianId(musicianId),
		);
	}
}

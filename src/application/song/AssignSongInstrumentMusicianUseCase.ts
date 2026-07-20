import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";

export class AssignSongInstrumentMusicianUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		songId: string,
		instrumentId: string,
		musicianEmail: string,
	): Promise<void> {
		await this.repository.assignMusician(
			songId,
			instrumentId,
			new MusicianEmail(musicianEmail),
		);
	}
}

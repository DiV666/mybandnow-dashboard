import { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";

export class InviteSongInstrumentMusicianUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		songId: string,
		instrumentId: string,
		musicianEmail: string,
	): Promise<void> {
		await this.repository.inviteMusician(
			new SongId(songId),
			new SongInstrumentId(instrumentId),
			new MusicianEmail(musicianEmail),
		);
	}
}

import { SongInstrument } from "../../domain/song/SongInstrument.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentName } from "../../domain/song/value-object/SongInstrumentName.js";
import { SongInstrumentType } from "../../domain/song/value-object/SongInstrumentType.js";

export class CreateSongInstrumentUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		songId: string,
		id: string,
		name: string,
		instrumentType: string,
		musicianId: string,
	): Promise<void> {
		const instrument = SongInstrument.create(
			new SongInstrumentId(id),
			new SongInstrumentName(name),
			new SongInstrumentType(instrumentType),
			new MusicianId(musicianId),
		);

		await this.repository.saveInstrument(songId, instrument);
	}
}

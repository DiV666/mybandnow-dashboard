import { InstrumentId } from "../../domain/instrument/value-object/InstrumentId.js";
import { SongInstrument } from "../../domain/song/SongInstrument.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentName } from "../../domain/song/value-object/SongInstrumentName.js";

export class CreateSongInstrumentUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		songId: string,
		id: string,
		name: string,
		instrumentId: string,
		musicianId: string,
	): Promise<void> {
		const instrument = SongInstrument.create(
			new SongInstrumentId(id),
			new SongInstrumentName(name),
			new InstrumentId(instrumentId),
			new MusicianId(musicianId),
		);

		await this.repository.saveInstrument(songId, instrument);
	}
}

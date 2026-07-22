import { InstrumentId } from "../../domain/instrument/value-object/InstrumentId.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import type { SongInstrumentDetailResponse } from "../../domain/song/SongInstrumentResponse.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentName } from "../../domain/song/value-object/SongInstrumentName.js";

export class UpdateSongInstrumentUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		songId: string,
		instrumentId: string,
		name: string,
		catalogInstrumentId: string,
	): Promise<SongInstrumentDetailResponse> {
		return this.repository.updateInstrument(
			new SongId(songId),
			new SongInstrumentId(instrumentId),
			{
				name: new SongInstrumentName(name).value,
				instrumentId: new InstrumentId(catalogInstrumentId).value,
			},
		);
	}
}

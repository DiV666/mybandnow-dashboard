import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentUploadId } from "../../domain/song/value-object/SongInstrumentUploadId.js";

export class ConfirmSongInstrumentUploadUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(songId: string, instrumentId: string, uploadId: string): Promise<void> {
		await this.repository.confirmInstrumentUpload(
			new SongId(songId),
			new SongInstrumentId(instrumentId),
			new SongInstrumentUploadId(uploadId),
		);
	}
}

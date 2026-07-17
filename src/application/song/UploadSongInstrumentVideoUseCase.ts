import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongInstrumentVideoFile } from "../../domain/song/value-object/SongInstrumentVideoFile.js";

export class UploadSongInstrumentVideoUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		songId: string,
		instrumentId: string,
		videoFile: File,
	): Promise<void> {
		const validatedVideoFile = new SongInstrumentVideoFile(videoFile);

		await this.repository.uploadInstrumentVideo(
			songId,
			instrumentId,
			validatedVideoFile.value,
		);
	}
}

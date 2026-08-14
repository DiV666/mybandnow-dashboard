import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongVideoclipId } from "../../domain/song/value-object/SongVideoclipId.js";

export class RequestSongVideoclipUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(songId: string): Promise<void> {
		await this.repository.requestVideoclipGeneration(
			new SongId(songId),
			new SongVideoclipId(crypto.randomUUID()),
		);
	}
}

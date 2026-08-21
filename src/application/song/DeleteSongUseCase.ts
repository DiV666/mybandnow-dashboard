import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";

export class DeleteSongUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(songId: string): Promise<void> {
		await this.repository.deleteSong(new SongId(songId));
	}
}

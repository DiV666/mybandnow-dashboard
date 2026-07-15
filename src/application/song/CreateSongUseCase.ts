import { Song } from "../../domain/song/Song.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongOriginalVideoclipUrl } from "../../domain/song/value-object/SongOriginalVideoclipUrl.js";
import { SongTitle } from "../../domain/song/value-object/SongTitle.js";

export class CreateSongUseCase {
	private readonly repository: SongRepository;

	constructor(repository: SongRepository) {
		this.repository = repository;
	}

	async run(
		bandId: string,
		id: string,
		title: string,
		originalVideoclipUrl: string,
	): Promise<void> {
		const song = Song.create(
			new SongId(id),
			new SongTitle(title),
			new SongOriginalVideoclipUrl(originalVideoclipUrl),
		);

		await this.repository.save(bandId, song);
	}
}

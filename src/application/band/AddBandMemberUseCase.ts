import type { BandRepository } from "../../domain/band/repository/BandRepository.js";
import { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";

export class AddBandMemberUseCase {
	private readonly repository: BandRepository;

	constructor(repository: BandRepository) {
		this.repository = repository;
	}

	async run(bandId: string, musicianEmail: string): Promise<void> {
		await this.repository.addMember(bandId, new MusicianEmail(musicianEmail));
	}
}

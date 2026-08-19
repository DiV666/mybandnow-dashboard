import type { BandRepository } from "../../domain/band/repository/BandRepository.js";

export class RemoveBandMemberUseCase {
	private readonly repository: BandRepository;

	constructor(repository: BandRepository) {
		this.repository = repository;
	}

	async run(bandId: string, musicianId: string): Promise<void> {
		await this.repository.removeMember(bandId, musicianId);
	}
}

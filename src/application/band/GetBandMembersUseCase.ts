import type { BandMemberResponse } from "../../domain/band/BandMemberResponse.js";
import type { BandRepository } from "../../domain/band/repository/BandRepository.js";

export class GetBandMembersUseCase {
	private readonly repository: BandRepository;

	constructor(repository: BandRepository) {
		this.repository = repository;
	}

	async run(bandId: string): Promise<BandMemberResponse[]> {
		return this.repository.getMembers(bandId);
	}
}

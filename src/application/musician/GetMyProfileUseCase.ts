import type { MusicianRepository } from '../../domain/musician/repository/MusicianRepository.js';
import type { Musician } from '../../domain/musician/Musician.js';

export type { MusicianPrimitives } from '../../domain/musician/Musician.js';

export class GetMyProfileUseCase {
	private readonly repository: MusicianRepository;

	constructor(repository: MusicianRepository) {
		this.repository = repository;
	}

	async run(): Promise<Musician | null> {
		return this.repository.getProfile();
	}
}

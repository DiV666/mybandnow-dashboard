import type { MusicianRepository } from "../../domain/musician/repository/MusicianRepository.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { MusicianName } from "../../domain/musician/value-object/MusicianName.js";
import { MusicianUsername } from "../../domain/musician/value-object/MusicianUsername.js";

export class CreateProfileUseCase {
	private readonly repository: MusicianRepository;

	constructor(repository: MusicianRepository) {
		this.repository = repository;
	}

	async run(name: string, username: string): Promise<void> {
		const id = new MusicianId(crypto.randomUUID());
		const musicianName = new MusicianName(name);
		const musicianUsername = new MusicianUsername(username);

		await this.repository.createProfile(id, musicianName, musicianUsername);
	}
}

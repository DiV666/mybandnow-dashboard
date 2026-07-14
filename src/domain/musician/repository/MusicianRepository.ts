import type { Musician } from "../Musician.js";
import type { MusicianId } from "../value-object/MusicianId.js";
import type { MusicianName } from "../value-object/MusicianName.js";
import type { MusicianUsername } from "../value-object/MusicianUsername.js";

export interface MusicianRepository {
	getProfile(): Promise<Musician | null>;
	createProfile(
		id: MusicianId,
		name: MusicianName,
		username: MusicianUsername,
	): Promise<void>;
}

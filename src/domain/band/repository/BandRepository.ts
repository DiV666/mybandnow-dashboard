import type { Band } from "../Band.js";
import type { BandMemberResponse } from "../BandMemberResponse.js";
import type { MusicianEmail } from "../../musician/value-object/MusicianEmail.js";

export interface BandRepository {
	getAll(): Promise<Band[]>;
	getById(id: string): Promise<Band | null>;
	getMembers(bandId: string): Promise<BandMemberResponse[]>;
	save(band: Band): Promise<void>;
	addMember(bandId: string, musicianEmail: MusicianEmail): Promise<void>;
}

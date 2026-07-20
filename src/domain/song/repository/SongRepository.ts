import type { Song } from "../Song.js";
import type { SongInstrument } from "../SongInstrument.js";
import type { MusicianEmail } from "../../musician/value-object/MusicianEmail.js";
import type {
	SongInstrumentDetailResponse,
	SongInstrumentListItemResponse,
} from "../SongInstrumentResponse.js";
import type { SongResponse } from "../SongResponse.js";

export interface SongRepository {
	save(bandId: string, song: Song): Promise<void>;
	getByBandId(bandId: string): Promise<SongResponse[]>;
	saveInstrument(songId: string, instrument: SongInstrument): Promise<void>;
	getInstrumentsBySongId(
		songId: string,
	): Promise<SongInstrumentListItemResponse[]>;
	getInstrumentById(
		songId: string,
		instrumentId: string,
	): Promise<SongInstrumentDetailResponse>;
	assignMusician(
		songId: string,
		instrumentId: string,
		musicianEmail: MusicianEmail,
	): Promise<void>;
	uploadInstrumentVideo(
		songId: string,
		instrumentId: string,
		videoFile: File,
	): Promise<void>;
}

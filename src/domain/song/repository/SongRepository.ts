import type { Song } from "../Song.js";
import type { SongInstrument } from "../SongInstrument.js";
import type { SongInstrumentListItemResponse } from "../SongInstrumentResponse.js";
import type { SongResponse } from "../SongResponse.js";

export interface SongRepository {
	save(bandId: string, song: Song): Promise<void>;
	getByBandId(bandId: string): Promise<SongResponse[]>;
	saveInstrument(songId: string, instrument: SongInstrument): Promise<void>;
	getInstrumentsBySongId(songId: string): Promise<SongInstrumentListItemResponse[]>;
}

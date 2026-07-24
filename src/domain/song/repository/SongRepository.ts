import type { Song } from "../Song.js";
import type { SongInstrument } from "../SongInstrument.js";
import type { MusicianEmail } from "../../musician/value-object/MusicianEmail.js";
import type { MusicianId } from "../../musician/value-object/MusicianId.js";
import type {
	SongInstrumentDetailResponse,
	SongInstrumentListItemResponse,
	UpdateSongInstrumentPayload,
	UpdateSongInstrumentVideoPayload,
} from "../SongInstrumentResponse.js";
import type { SongResponse } from "../SongResponse.js";
import type { SongId } from "../value-object/SongId.js";
import type { SongInstrumentId } from "../value-object/SongInstrumentId.js";
import type { SongInstrumentVideoFile } from "../value-object/SongInstrumentVideoFile.js";

export interface SongRepository {
	save(bandId: string, song: Song): Promise<void>;
	getByBandId(bandId: string): Promise<SongResponse[]>;
	saveInstrument(songId: SongId, instrument: SongInstrument): Promise<void>;
	getInstrumentsBySongId(
		songId: SongId,
	): Promise<SongInstrumentListItemResponse[]>;
	getInstrumentById(
		songId: SongId,
		instrumentId: SongInstrumentId,
	): Promise<SongInstrumentDetailResponse>;
	updateInstrument(
		songId: SongId,
		instrumentId: SongInstrumentId,
		payload: UpdateSongInstrumentPayload,
	): Promise<SongInstrumentDetailResponse>;
	updateInstrumentVideoStartTime(
		songId: SongId,
		instrumentId: SongInstrumentId,
		payload: UpdateSongInstrumentVideoPayload,
	): Promise<void>;
	assignMusician(
		songId: SongId,
		instrumentId: SongInstrumentId,
		musicianId: MusicianId,
	): Promise<void>;
	inviteMusician(
		songId: SongId,
		instrumentId: SongInstrumentId,
		musicianEmail: MusicianEmail,
	): Promise<void>;
	uploadInstrumentVideo(
		songId: SongId,
		instrumentId: SongInstrumentId,
		videoFile: SongInstrumentVideoFile,
	): Promise<void>;
}

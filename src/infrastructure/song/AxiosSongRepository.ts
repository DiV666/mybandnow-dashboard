import { httpClient } from "../http/httpClient.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import type { Song } from "../../domain/song/Song.js";
import type { SongInstrument } from "../../domain/song/SongInstrument.js";
import type { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";
import type { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import type {
	SongInstrumentCollectionResponse,
	SongInstrumentDetailResponse,
	SongInstrumentListItemResponse,
} from "../../domain/song/SongInstrumentResponse.js";
import type {
	SongCollectionResponse,
	SongResponse,
} from "../../domain/song/SongResponse.js";
import type { SongId } from "../../domain/song/value-object/SongId.js";
import type { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import type { SongInstrumentVideoFile } from "../../domain/song/value-object/SongInstrumentVideoFile.js";

export class AxiosSongRepository implements SongRepository {
	async save(bandId: string, song: Song): Promise<void> {
		await httpClient.post(`/v1/bands/${bandId}/songs`, song.toPrimitives());
	}

	async getByBandId(bandId: string): Promise<SongResponse[]> {
		const response = await httpClient.get<SongCollectionResponse>(
			`/v1/bands/${bandId}/songs`,
		);

		return response.data.items;
	}

	async saveInstrument(
		songId: SongId,
		instrument: SongInstrument,
	): Promise<void> {
		await httpClient.post(
			`/v1/songs/${songId.value}/instruments`,
			instrument.toPrimitives(),
		);
	}

	async getInstrumentsBySongId(
		songId: SongId,
	): Promise<SongInstrumentListItemResponse[]> {
		const response = await httpClient.get<SongInstrumentCollectionResponse>(
			`/v1/songs/${songId.value}/instruments`,
		);

		return response.data.items;
	}

	async getInstrumentById(
		songId: SongId,
		instrumentId: SongInstrumentId,
	): Promise<SongInstrumentDetailResponse> {
		const response = await httpClient.get<SongInstrumentDetailResponse>(
			`/v1/songs/${songId.value}/instruments/${instrumentId.value}`,
		);

		return response.data;
	}

	async assignMusician(
		songId: SongId,
		instrumentId: SongInstrumentId,
		musicianId: MusicianId,
	): Promise<void> {
		await httpClient.patch(
			`/v1/songs/${songId.value}/instruments/${instrumentId.value}`,
			{
				musicianId: musicianId.value,
			},
		);
	}

	async inviteMusician(
		songId: SongId,
		instrumentId: SongInstrumentId,
		musicianEmail: MusicianEmail,
	): Promise<void> {
		await httpClient.post(
			`/v1/songs/${songId.value}/instruments/${instrumentId.value}/invite`,
			{
				musicianEmail: musicianEmail.value,
			},
		);
	}

	async uploadInstrumentVideo(
		songId: SongId,
		instrumentId: SongInstrumentId,
		videoFile: SongInstrumentVideoFile,
	): Promise<void> {
		const formData = new FormData();
		formData.append("video", videoFile.value);

		await httpClient.post(
			`/v1/songs/${songId.value}/instruments/${instrumentId.value}/upload`,
			formData,
			{ timeout: 120000 },
		);
	}
}

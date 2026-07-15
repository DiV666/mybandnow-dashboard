import { httpClient } from "../http/httpClient.js";
import type { SongRepository } from "../../domain/song/repository/SongRepository.js";
import type { Song } from "../../domain/song/Song.js";
import type { SongInstrument } from "../../domain/song/SongInstrument.js";
import type {
	SongInstrumentCollectionResponse,
	SongInstrumentListItemResponse,
} from "../../domain/song/SongInstrumentResponse.js";
import type {
	SongCollectionResponse,
	SongResponse,
} from "../../domain/song/SongResponse.js";

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

	async saveInstrument(songId: string, instrument: SongInstrument): Promise<void> {
		await httpClient.post(
			`/v1/songs/${songId}/instruments`,
			instrument.toPrimitives(),
		);
	}

	async getInstrumentsBySongId(
		songId: string,
	): Promise<SongInstrumentListItemResponse[]> {
		const response = await httpClient.get<SongInstrumentCollectionResponse>(
			`/v1/songs/${songId}/instruments`,
		);

		return response.data.items;
	}
}

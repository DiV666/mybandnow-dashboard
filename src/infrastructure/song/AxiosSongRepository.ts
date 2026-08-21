import axios from "axios";
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
	UpdateSongInstrumentPayload,
	UpdateSongInstrumentVideoPayload,
} from "../../domain/song/SongInstrumentResponse.js";
import type {
	SongCollectionResponse,
	SongResponse,
} from "../../domain/song/SongResponse.js";
import type { SongId } from "../../domain/song/value-object/SongId.js";
import type { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentUploadId } from "../../domain/song/value-object/SongInstrumentUploadId.js";
import type { SongInstrumentVideoFile } from "../../domain/song/value-object/SongInstrumentVideoFile.js";
import type { SongVideoclipId } from "../../domain/song/value-object/SongVideoclipId.js";

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

	async deleteSong(songId: SongId): Promise<void> {
		await httpClient.delete(`/v1/songs/${songId.value}`);
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

	async updateInstrument(
		songId: SongId,
		instrumentId: SongInstrumentId,
		payload: UpdateSongInstrumentPayload,
	): Promise<SongInstrumentDetailResponse> {
		await httpClient.patch(
			`/v1/songs/${songId.value}/instruments/${instrumentId.value}`,
			payload,
		);

		return this.getInstrumentById(songId, instrumentId);
	}

	async updateInstrumentVideoStartTime(
		songId: SongId,
		instrumentId: SongInstrumentId,
		payload: UpdateSongInstrumentVideoPayload,
	): Promise<void> {
		await httpClient.patch(
			`/v1/songs/${songId.value}/instruments/${instrumentId.value}/video`,
			payload,
		);
	}

	async deleteInstrument(
		songId: SongId,
		instrumentId: SongInstrumentId,
	): Promise<void> {
		await httpClient.delete(
			`/v1/songs/${songId.value}/instruments/${instrumentId.value}`,
		);
	}

	async assignMusician(
		songId: SongId,
		instrumentId: SongInstrumentId,
		musicianId: MusicianId,
	): Promise<void> {
		await httpClient.patch(
			`/v1/songs/${songId.value}/instruments/${instrumentId.value}/musician-assign`,
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

	private getInstrumentUploadPath(songId: SongId, instrumentId: SongInstrumentId): string {
		return `/v1/songs/${songId.value}/instruments/${instrumentId.value}/upload`;
	}

	async uploadInstrumentVideo(
		songId: SongId,
		instrumentId: SongInstrumentId,
		videoFile: SongInstrumentVideoFile,
	): Promise<void> {
		const uploadPath = this.getInstrumentUploadPath(songId, instrumentId);

		const { data } = await httpClient.post<{ uploadId: string; uploadUrl: string }>(
			uploadPath,
		);
		const uploadId = new SongInstrumentUploadId(data.uploadId);

		try {
			// Raw axios.put, not httpClient: this PUT goes straight to a signed GCS URL, which
			// must not carry httpClient's interceptor-injected auth/correlation headers meant
			// for our own API.
			await axios.put(data.uploadUrl, videoFile.value, {
				headers: { "Content-Type": "video/mp4" },
				timeout: 120000,
			});
		} catch (error) {
			await this.cancelInstrumentUpload(songId, instrumentId, uploadId).catch(() => {
				// The error itself may carry the signed upload URL/headers; keep the log message
				// free of that detail.
				console.error("Failed to cancel the orphaned upload attempt after a PUT failure");
			});
			throw error;
		}

		await this.confirmInstrumentUpload(songId, instrumentId, uploadId);
	}

	async cancelInstrumentUpload(
		songId: SongId,
		instrumentId: SongInstrumentId,
		uploadId: SongInstrumentUploadId,
	): Promise<void> {
		await httpClient.post(
			`${this.getInstrumentUploadPath(songId, instrumentId)}/${uploadId.value}/cancel`,
		);
	}

	async confirmInstrumentUpload(
		songId: SongId,
		instrumentId: SongInstrumentId,
		uploadId: SongInstrumentUploadId,
	): Promise<void> {
		await httpClient.post(
			`${this.getInstrumentUploadPath(songId, instrumentId)}/${uploadId.value}/confirm`,
		);
	}

	async requestVideoclipGeneration(
		songId: SongId,
		videoclipId: SongVideoclipId,
	): Promise<void> {
		await httpClient.post(`/v1/songs/${songId.value}/videoclip`, {
			id: videoclipId.value,
		});
	}
}

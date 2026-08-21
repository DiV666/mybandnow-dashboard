import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosSongRepository } from "./AxiosSongRepository.js";
import { httpClient } from "../http/httpClient.js";
import { InstrumentId } from "../../domain/instrument/value-object/InstrumentId.js";
import { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { Song } from "../../domain/song/Song.js";
import { SongInstrument } from "../../domain/song/SongInstrument.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentName } from "../../domain/song/value-object/SongInstrumentName.js";
import { SongInstrumentUploadId } from "../../domain/song/value-object/SongInstrumentUploadId.js";
import { SongInstrumentVideoFile } from "../../domain/song/value-object/SongInstrumentVideoFile.js";
import { SongOriginalVideoclipUrl } from "../../domain/song/value-object/SongOriginalVideoclipUrl.js";
import { SongTitle } from "../../domain/song/value-object/SongTitle.js";
import { SongVideoclipId } from "../../domain/song/value-object/SongVideoclipId.js";

describe("AxiosSongRepository", () => {
	const repository = new AxiosSongRepository();

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should send the selected band id and song payload when creating a song", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined } as never);

		await repository.save(
			"band-123",
			Song.create(
				new SongId("11111111-1111-4111-8111-111111111111"),
				new SongTitle("Paint It Black"),
				new SongOriginalVideoclipUrl(
					"https://www.youtube.com/watch?v=O4irXQhgMqg",
				),
			),
		);

		expect(postSpy).toHaveBeenCalledWith("/v1/bands/band-123/songs", {
			id: "11111111-1111-4111-8111-111111111111",
			title: "Paint It Black",
			originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
		});
		expect(postSpy.mock.calls[0][1]).not.toHaveProperty("url");
	});

	it("should return the songs for the selected band", async () => {
		const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue({
			data: {
				items: [
					{
						id: "song-1",
						bandId: "band-123",
						title: "Paint It Black",
						originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
						originalVideoClipDurationSeconds: 187,
					},
				],
				total: 1,
			},
		} as never);

		const songs = await repository.getByBandId("band-123");

		expect(getSpy).toHaveBeenCalledWith("/v1/bands/band-123/songs");
		expect(songs).toEqual([
			{
				id: "song-1",
				bandId: "band-123",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
				originalVideoClipDurationSeconds: 187,
			},
		]);
	});

	it("should delete the selected song", async () => {
		const deleteSpy = vi
			.spyOn(httpClient, "delete")
			.mockResolvedValue({ data: undefined } as never);

		await repository.deleteSong(new SongId("song-123"));

		expect(deleteSpy).toHaveBeenCalledWith("/v1/songs/song-123");
	});

	it("should send the selected song id and instrument payload when creating a song instrument", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined } as never);

		await repository.saveInstrument(
			new SongId("song-123"),
			SongInstrument.create(
				new SongInstrumentId("11111111-1111-4111-8111-111111111111"),
				new SongInstrumentName("Guitarra principal"),
				new InstrumentId("catalog-1"),
				new MusicianId("22222222-2222-4222-8222-222222222222"),
			),
		);

		expect(postSpy).toHaveBeenCalledWith("/v1/songs/song-123/instruments", {
			id: "11111111-1111-4111-8111-111111111111",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			musicianId: "22222222-2222-4222-8222-222222222222",
		});
	});

	it("should return the instruments for the selected song", async () => {
		const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue({
			data: {
				items: [
					{
						id: "instrument-1",
						name: "Guitarra principal",
						instrumentId: "catalog-1",
						songId: "song-123",
						musicianId: "musician-123",
						createdAt: "2026-07-15T10:00:00.000Z",
						upload: {
							status: "READY",
						},
					},
				],
				total: 1,
			},
		} as never);

		const instruments = await repository.getInstrumentsBySongId(
			new SongId("song-123"),
		);

		expect(getSpy).toHaveBeenCalledWith("/v1/songs/song-123/instruments");
		expect(instruments).toEqual([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-123",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: {
					status: "READY",
				},
			},
		]);
	});

	it("should return the instrument detail for the selected song instrument", async () => {
		const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue({
			data: {
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-123",
				createdAt: "2026-07-15T10:00:00.000Z",
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/video-1.mp4",
					duration: 123,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: {
					status: "COMPLETED",
				},
			},
		} as never);

		const instrument = await repository.getInstrumentById(
			new SongId("song-123"),
			new SongInstrumentId("instrument-1"),
		);

		expect(getSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-1",
		);
		expect(instrument).toEqual({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-123",
			createdAt: "2026-07-15T10:00:00.000Z",
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/video-1.mp4",
				duration: 123,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: {
				status: "COMPLETED",
			},
		});
	});

	it("should patch the selected song instrument and then return its refreshed detail", async () => {
		const patchSpy = vi
			.spyOn(httpClient, "patch")
			.mockResolvedValue({ data: undefined } as never);
		const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue({
			data: {
				id: "instrument-456",
				name: "Guitarra acústica",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-789",
				createdAt: "2026-07-15T10:00:00.000Z",
				video: null,
				upload: null,
			},
		} as never);

		const instrument = await repository.updateInstrument(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			{
				name: "Guitarra acústica",
				instrumentId: "catalog-2",
			},
		);

		expect(patchSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-456",
			{
				name: "Guitarra acústica",
				instrumentId: "catalog-2",
			},
		);
		expect(getSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-456",
		);
		expect(instrument).toEqual({
			id: "instrument-456",
			name: "Guitarra acústica",
			instrumentId: "catalog-2",
			songId: "song-123",
			musicianId: "musician-789",
			createdAt: "2026-07-15T10:00:00.000Z",
			video: null,
			upload: null,
		});
	});

	it("should patch the selected song instrument video timing through the dedicated video endpoint", async () => {
		const patchSpy = vi
			.spyOn(httpClient, "patch")
			.mockResolvedValue({ data: undefined } as never);

		await repository.updateInstrumentVideoStartTime(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			{
				startTimeMs: 3500,
			},
		);

		expect(patchSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-456/video",
			{
				startTimeMs: 3500,
			},
		);
	});

	it("should delete the selected song instrument", async () => {
		const deleteSpy = vi
			.spyOn(httpClient, "delete")
			.mockResolvedValue({ data: undefined } as never);

		await repository.deleteInstrument(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
		);

		expect(deleteSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-456",
		);
	});

	it("should patch the selected song instrument musician assignment endpoint", async () => {
		const patchSpy = vi
			.spyOn(httpClient, "patch")
			.mockResolvedValue({ data: undefined } as never);

		await repository.assignMusician(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			new MusicianId("musician-789"),
		);

		expect(patchSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-456/musician-assign",
			{
				musicianId: "musician-789",
			},
		);
	});

	it("should invite a musician by email for the selected song instrument", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined } as never);

		await repository.inviteMusician(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			new MusicianEmail("player@example.com"),
		);

		expect(postSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-456/invite",
			{
				musicianEmail: "player@example.com",
			},
		);
	});

	it("should request a signed upload URL, PUT the video to it, then confirm the upload", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValueOnce({
				data: {
					uploadId: "upload-789",
					uploadUrl: "https://storage.example/signed-upload",
				},
			} as never)
			.mockResolvedValueOnce({ data: undefined } as never);
		const putSpy = vi
			.spyOn(axios, "put")
			.mockResolvedValue({ data: undefined } as never);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});

		await repository.uploadInstrumentVideo(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			new SongInstrumentVideoFile(videoFile),
		);

		expect(postSpy).toHaveBeenNthCalledWith(
			1,
			"/v1/songs/song-123/instruments/instrument-456/upload",
		);
		expect(putSpy).toHaveBeenCalledWith(
			"https://storage.example/signed-upload",
			videoFile,
			{
				headers: { "Content-Type": "video/mp4" },
				timeout: 120000,
			},
		);
		expect(postSpy).toHaveBeenNthCalledWith(
			2,
			"/v1/songs/song-123/instruments/instrument-456/upload/upload-789/confirm",
		);
	});

	it("should cancel the upload attempt and rethrow the original error when the PUT to the signed URL fails", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValueOnce({
				data: {
					uploadId: "upload-789",
					uploadUrl: "https://storage.example/signed-upload",
				},
			} as never)
			.mockResolvedValueOnce({ data: undefined } as never);
		const putError = new Error("Network Error blocked by CORS policy");
		const putSpy = vi.spyOn(axios, "put").mockRejectedValue(putError);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});

		await expect(
			repository.uploadInstrumentVideo(
				new SongId("song-123"),
				new SongInstrumentId("instrument-456"),
				new SongInstrumentVideoFile(videoFile),
			),
		).rejects.toBe(putError);

		expect(putSpy).toHaveBeenCalledOnce();
		expect(postSpy).toHaveBeenNthCalledWith(
			2,
			"/v1/songs/song-123/instruments/instrument-456/upload/upload-789/cancel",
		);
		expect(postSpy).toHaveBeenCalledTimes(2);
	});

	it("should cancel the active upload attempt for the selected song instrument", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined } as never);

		await repository.cancelInstrumentUpload(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			new SongInstrumentUploadId("upload-789"),
		);

		expect(postSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-456/upload/upload-789/cancel",
		);
	});

	it("should confirm a previously started upload attempt for the selected song instrument", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined } as never);

		await repository.confirmInstrumentUpload(
			new SongId("song-123"),
			new SongInstrumentId("instrument-456"),
			new SongInstrumentUploadId("upload-789"),
		);

		expect(postSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-456/upload/upload-789/confirm",
		);
	});

	it("should request the videoclip generation for the selected song", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined } as never);

		await repository.requestVideoclipGeneration(
			new SongId("song-123"),
			new SongVideoclipId("11111111-1111-4111-8111-111111111111"),
		);

		expect(postSpy).toHaveBeenCalledWith("/v1/songs/song-123/videoclip", {
			id: "11111111-1111-4111-8111-111111111111",
		});
	});
});

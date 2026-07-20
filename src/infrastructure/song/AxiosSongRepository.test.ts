import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosSongRepository } from "./AxiosSongRepository.js";
import { httpClient } from "../http/httpClient.js";
import { InstrumentId } from "../../domain/instrument/value-object/InstrumentId.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { Song } from "../../domain/song/Song.js";
import { SongInstrument } from "../../domain/song/SongInstrument.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentName } from "../../domain/song/value-object/SongInstrumentName.js";
import { SongOriginalVideoclipUrl } from "../../domain/song/value-object/SongOriginalVideoclipUrl.js";
import { SongTitle } from "../../domain/song/value-object/SongTitle.js";

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
			},
		]);
	});

	it("should send the selected song id and instrument payload when creating a song instrument", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined } as never);

		await repository.saveInstrument(
			"song-123",
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

		const instruments = await repository.getInstrumentsBySongId("song-123");

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
			"song-123",
			"instrument-1",
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

	it("should upload an MP4 file as multipart form data for the selected song instrument with a 2 minute timeout", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined } as never);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});

		await repository.uploadInstrumentVideo(
			"song-123",
			"instrument-456",
			videoFile,
		);

		expect(postSpy).toHaveBeenCalledTimes(1);
		expect(postSpy.mock.calls[0][0]).toBe(
			"/v1/songs/song-123/instruments/instrument-456/upload",
		);
		const formData = postSpy.mock.calls[0][1];
		expect(formData).toBeInstanceOf(FormData);
		expect((formData as FormData).get("video")).toBe(videoFile);
		expect(postSpy).toHaveBeenCalledWith(
			"/v1/songs/song-123/instruments/instrument-456/upload",
			formData,
			{ timeout: 120000 },
		);
		expect(postSpy.mock.calls[0]).toHaveLength(3);
	});
});

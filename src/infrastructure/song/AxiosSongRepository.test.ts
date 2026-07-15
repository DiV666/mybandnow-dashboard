import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosSongRepository } from "./AxiosSongRepository.js";
import { httpClient } from "../http/httpClient.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { Song } from "../../domain/song/Song.js";
import { SongInstrument } from "../../domain/song/SongInstrument.js";
import { SongId } from "../../domain/song/value-object/SongId.js";
import { SongInstrumentId } from "../../domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentName } from "../../domain/song/value-object/SongInstrumentName.js";
import { SongInstrumentType } from "../../domain/song/value-object/SongInstrumentType.js";
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
				new SongInstrumentType("electric-guitar"),
				new MusicianId("22222222-2222-4222-8222-222222222222"),
			),
		);

		expect(postSpy).toHaveBeenCalledWith("/v1/songs/song-123/instruments", {
			id: "11111111-1111-4111-8111-111111111111",
			name: "Guitarra principal",
			instrumentType: "electric-guitar",
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
						instrumentType: "electric-guitar",
						songId: "song-123",
						musicianId: "musician-123",
						createdAt: "2026-07-15T10:00:00.000Z",
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
				instrumentType: "electric-guitar",
				songId: "song-123",
				musicianId: "musician-123",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
	});
});

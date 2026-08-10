import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useSongInstrumentDetails } from "./useSongInstrumentDetails.js";
import {
	songInstrumentUploadStatuses,
	type SongInstrumentDetailResponse,
	type SongInstrumentListItemResponse,
} from "../../domain/song/SongInstrumentResponse.js";
import type { SongResponse } from "../../domain/song/SongResponse.js";

function makeSong(overrides: Partial<SongResponse> = {}): SongResponse {
	return {
		id: "song-1",
		title: "My Song",
		bandId: "band-1",
		originalVideoclipUrl: "",
		...overrides,
	} as SongResponse;
}

function makeInstrument(
	overrides: Partial<SongInstrumentListItemResponse> = {},
): SongInstrumentListItemResponse {
	return {
		id: "instrument-1",
		name: "Guitar",
		songId: "song-1",
		musicianId: "",
		createdAt: "2026-07-15T10:00:00.000Z",
		upload: null,
		...overrides,
	} as SongInstrumentListItemResponse;
}

function makeDetail(
	overrides: Partial<SongInstrumentDetailResponse> = {},
): SongInstrumentDetailResponse {
	return {
		id: "instrument-1",
		name: "Guitar",
		songId: "song-1",
		musicianId: "",
		instrumentId: "catalog-1",
		createdAt: "2026-07-15T10:00:00.000Z",
		video: null,
		upload: null,
		...overrides,
	} as SongInstrumentDetailResponse;
}

describe("useSongInstrumentDetails", () => {
	const getSongInstrumentDetailUseCase = { run: vi.fn() };

	beforeEach(() => {
		getSongInstrumentDetailUseCase.run.mockReset();
	});

	function createComposable() {
		const songs = ref<SongResponse[]>([makeSong()]);
		const songInstruments = ref<Record<string, SongInstrumentListItemResponse[]>>({
			"song-1": [makeInstrument()],
		});
		const getSongInstrumentCatalogId = vi.fn(
			(instrument: SongInstrumentListItemResponse | SongInstrumentDetailResponse) =>
				instrument.instrumentId ?? instrument.instrumentType ?? "",
		);
		const ensureCatalogInstrumentNameLoaded = vi.fn().mockResolvedValue(undefined);
		const getCatalogInstrumentName = vi.fn((instrumentId: string) => `Name(${instrumentId})`);
		const ensureMusicianDisplayNameLoaded = vi.fn().mockResolvedValue(undefined);

		const composable = useSongInstrumentDetails({
			getSongInstrumentDetailUseCase,
			songs,
			songInstruments,
			getSongInstrumentCatalogId,
			ensureCatalogInstrumentNameLoaded,
			getCatalogInstrumentName,
			ensureMusicianDisplayNameLoaded,
		});

		return {
			...composable,
			songs,
			songInstruments,
			getSongInstrumentCatalogId,
			ensureCatalogInstrumentNameLoaded,
			getCatalogInstrumentName,
			ensureMusicianDisplayNameLoaded,
		};
	}

	it("returns the instrument upload when it is in progress instead of the cached detail upload", () => {
		const { songInstrumentDetails, songInstruments, getEffectiveUpload } = createComposable();
		const inProgressUpload = { status: songInstrumentUploadStatuses.PROCESSING } as const;
		songInstruments.value = {
			"song-1": [makeInstrument({ upload: inProgressUpload })],
		};
		songInstrumentDetails.value = {
			"song-1:instrument-1": makeDetail({
				upload: { status: songInstrumentUploadStatuses.COMPLETED } as never,
			}),
		};

		const result = getEffectiveUpload("song-1", songInstruments.value["song-1"][0]);

		expect(result).toEqual(inProgressUpload);
	});

	it("falls back to the cached detail upload when the instrument upload is not in progress", () => {
		const { setSongInstrumentDetail, getEffectiveUpload, songInstruments } = createComposable();
		const detailUpload = { status: songInstrumentUploadStatuses.COMPLETED } as const;
		setSongInstrumentDetail(makeDetail({ upload: detailUpload }));

		const result = getEffectiveUpload("song-1", songInstruments.value["song-1"][0]);

		expect(result).toEqual(detailUpload);
	});

	it("refreshes the detail, caches it, and resolves catalog/musician names", async () => {
		const {
			refreshSongInstrumentDetail,
			songInstrumentDetails,
			ensureCatalogInstrumentNameLoaded,
			ensureMusicianDisplayNameLoaded,
		} = createComposable();
		const detail = makeDetail({ instrumentId: "catalog-1", musicianId: "musician-1" });
		getSongInstrumentDetailUseCase.run.mockResolvedValue(detail);

		const result = await refreshSongInstrumentDetail("song-1", "instrument-1");

		expect(getSongInstrumentDetailUseCase.run).toHaveBeenCalledWith("song-1", "instrument-1");
		expect(result).toEqual(detail);
		expect(songInstrumentDetails.value["song-1:instrument-1"]).toEqual(detail);
		expect(ensureCatalogInstrumentNameLoaded).toHaveBeenCalledWith("catalog-1");
		expect(ensureMusicianDisplayNameLoaded).toHaveBeenCalledWith("musician-1");
	});

	it("does not cache the refreshed detail when the song is no longer visible once the promise resolves", async () => {
		const { refreshSongInstrumentDetail, songInstrumentDetails, songs } = createComposable();
		let resolveRun: (detail: SongInstrumentDetailResponse) => void = () => {};
		getSongInstrumentDetailUseCase.run.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRun = resolve;
				}),
		);

		const pending = refreshSongInstrumentDetail("song-1", "instrument-1");
		songs.value = [];
		resolveRun(makeDetail());
		await pending;

		expect(songInstrumentDetails.value["song-1:instrument-1"]).toBeUndefined();
	});

	it("syncs the matching songInstruments entry when a detail is set", () => {
		const { setSongInstrumentDetail, songInstruments } = createComposable();

		setSongInstrumentDetail(
			makeDetail({
				name: "Bass",
				instrumentId: "catalog-2",
				instrumentType: "string",
				musicianId: "musician-2",
				upload: { status: songInstrumentUploadStatuses.COMPLETED } as never,
			}),
		);

		expect(songInstruments.value["song-1"][0]).toMatchObject({
			name: "Bass",
			instrumentId: "catalog-2",
			instrumentType: "string",
			musicianId: "musician-2",
			upload: { status: songInstrumentUploadStatuses.COMPLETED },
		});
	});

	it("resolves the display name via the injected catalog lookups", () => {
		const { getSongInstrumentDisplayName, getSongInstrumentCatalogId, getCatalogInstrumentName } =
			createComposable();
		const instrument = makeInstrument({ instrumentId: "catalog-1" });

		const result = getSongInstrumentDisplayName(instrument);

		expect(getSongInstrumentCatalogId).toHaveBeenCalledWith(instrument);
		expect(getCatalogInstrumentName).toHaveBeenCalledWith("catalog-1");
		expect(result).toBe("Name(catalog-1)");
	});
});

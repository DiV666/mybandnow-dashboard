import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, ref, type Ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useSongInstrumentUpload } from "./useSongInstrumentUpload.js";
import { useToastStore } from "../stores/useToastStore.js";
import { i18n } from "../../infrastructure/config/i18n.js";
import {
	songInstrumentUploadStatuses,
	type SongInstrumentDetailResponse,
	type SongInstrumentListItemResponse,
	type SongInstrumentUploadResponse,
} from "../../domain/song/SongInstrumentResponse.js";
import type { SongResponse } from "../../domain/song/SongResponse.js";

type TestNode = { type: string; parent: TestNode | null; children: TestNode[] };

// Vue's custom renderer allows mounting a real component instance without a DOM,
// which is required for `useI18n()`/`useToastStore()` to resolve their component context.
const renderer = createRenderer<TestNode, TestNode>({
	patchProp() {},
	insert(child, parent) {
		child.parent = parent;
		parent.children.push(child);
	},
	remove(child) {
		if (!child.parent) {
			return;
		}
		child.parent.children = child.parent.children.filter((node) => node !== child);
		child.parent = null;
	},
	createElement(type) {
		return { type, parent: null, children: [] };
	},
	createText(text) {
		return { type: text, parent: null, children: [] };
	},
	createComment(text) {
		return { type: text, parent: null, children: [] };
	},
	setText() {},
	setElementText() {},
	parentNode(node) {
		return node.parent;
	},
	nextSibling(node) {
		if (!node.parent) {
			return null;
		}
		const index = node.parent.children.indexOf(node);
		return node.parent.children[index + 1] ?? null;
	},
});

function withSetup<T>(composable: () => T): T {
	let result: T;
	const pinia = createPinia();
	setActivePinia(pinia);
	const app = renderer.createApp({
		setup() {
			result = composable();
			return () => null;
		},
	});
	app.use(pinia);
	app.use(i18n);
	app.mount({ type: "root", parent: null, children: [] });
	return result!;
}

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

function makeMp4File(): File {
	return new File(["content"], "video.mp4", { type: "video/mp4" });
}

describe("useSongInstrumentUpload", () => {
	const uploadSongInstrumentVideoUseCase = { run: vi.fn() };
	const refreshSongInstrumentDetail = vi.fn();
	const getEffectiveUpload = vi.fn();
	const getEffectiveVideo = vi.fn();
	const getSongInstrument = vi.fn();
	const isSongInstrumentInProgress = vi.fn();

	beforeEach(() => {
		uploadSongInstrumentVideoUseCase.run.mockReset();
		refreshSongInstrumentDetail.mockReset();
		getEffectiveUpload.mockReset().mockReturnValue(null);
		getEffectiveVideo.mockReset().mockReturnValue(null);
		getSongInstrument.mockReset();
		isSongInstrumentInProgress.mockReset().mockImplementation(
			(upload: SongInstrumentUploadResponse | null) =>
				upload?.status === songInstrumentUploadStatuses.PENDING ||
				upload?.status === songInstrumentUploadStatuses.READY ||
				upload?.status === songInstrumentUploadStatuses.PROCESSING,
		);
		i18n.global.locale.value = "en";
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function createComposable(songs: Ref<SongResponse[]>) {
		const songInstruments = ref<Record<string, SongInstrumentListItemResponse[]>>({
			"song-1": [makeInstrument()],
		});
		let toastStore: ReturnType<typeof useToastStore>;

		const composable = withSetup(() => {
			toastStore = useToastStore();
			return useSongInstrumentUpload({
				uploadSongInstrumentVideoUseCase,
				songs,
				songInstruments,
				refreshSongInstrumentDetail,
				getEffectiveUpload,
				getEffectiveVideo,
				getSongInstrument,
				isSongInstrumentInProgress,
			});
		});

		return {
			...composable,
			songInstruments,
			toastStore: toastStore!,
		};
	}

	describe("handleUploadSongInstrumentVideo", () => {
		it("does not call the use case and shows a message when no file was selected", async () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { handleUploadSongInstrumentVideo, toastStore } = createComposable(songs);

			await handleUploadSongInstrumentVideo("song-1", "instrument-1");

			expect(uploadSongInstrumentVideoUseCase.run).not.toHaveBeenCalled();
			expect(toastStore.toasts[0].message).toBe("Select a video before continuing.");
		});

		it("starts progress, uploads, schedules a poll, and closes the modal on success", async () => {
			vi.useFakeTimers();
			const songs = ref<SongResponse[]>([makeSong()]);
			const {
				handleUploadSongInstrumentVideo,
				handleSongInstrumentVideoSelection,
				getSongInstrumentUploadState,
				openSongInstrumentUploadModal,
				activeSongInstrumentUploadModal,
			} = createComposable(songs);
			getSongInstrument.mockReturnValue(makeInstrument());
			uploadSongInstrumentVideoUseCase.run.mockResolvedValue(undefined);
			openSongInstrumentUploadModal("song-1", "instrument-1");
			handleSongInstrumentVideoSelection("song-1", "instrument-1", {
				target: { files: [makeMp4File()] },
			} as unknown as Event);

			const uploadPromise = handleUploadSongInstrumentVideo("song-1", "instrument-1");
			// Right after starting, the request-progress stage should be active.
			expect(getSongInstrumentUploadState("song-1", "instrument-1").progressStage).toBe(
				"REQUEST",
			);
			await uploadPromise;

			expect(uploadSongInstrumentVideoUseCase.run).toHaveBeenCalledWith(
				"song-1",
				"instrument-1",
				expect.any(File),
			);
			expect(activeSongInstrumentUploadModal.value).toBeNull();
			const state = getSongInstrumentUploadState("song-1", "instrument-1");
			expect(state.isSubmitting).toBe(false);
			expect(state.selectedFile).toBeNull();
			// A poll must be scheduled: advancing past the interval triggers a refresh call.
			refreshSongInstrumentDetail.mockResolvedValue(makeDetail());
			await vi.advanceTimersByTimeAsync(5000);
			expect(refreshSongInstrumentDetail).toHaveBeenCalledWith("song-1", "instrument-1");
		});

		it("maps the upload error instead of leaking the raw error message", async () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { handleUploadSongInstrumentVideo, handleSongInstrumentVideoSelection, toastStore } =
				createComposable(songs);
			handleSongInstrumentVideoSelection("song-1", "instrument-1", {
				target: { files: [makeMp4File()] },
			} as unknown as Event);
			uploadSongInstrumentVideoUseCase.run.mockRejectedValue({
				response: { status: 403, data: { message: "some raw backend detail" } },
			});

			await handleUploadSongInstrumentVideo("song-1", "instrument-1");

			expect(toastStore.toasts[0].message).toBe(
				"Only the person assigned to this instrument can upload the video.",
			);
			expect(toastStore.toasts[0].message).not.toContain("raw backend detail");
		});
	});

	// runSongInstrumentPoll is exercised indirectly through scheduleSongInstrumentPoll + fake
	// timers, matching how it is actually triggered in production (its poll-version guard only
	// lets the scheduler itself produce a valid version).
	describe("runSongInstrumentPoll (via scheduleSongInstrumentPoll)", () => {
		it("reschedules another poll while the upload is still in progress", async () => {
			vi.useFakeTimers();
			const songs = ref<SongResponse[]>([makeSong()]);
			const { scheduleSongInstrumentPoll, cancelAllSongInstrumentPolls } =
				createComposable(songs);
			refreshSongInstrumentDetail.mockResolvedValue(
				makeDetail({ upload: { status: songInstrumentUploadStatuses.PROCESSING } }),
			);

			scheduleSongInstrumentPoll("song-1", "instrument-1", 1);
			await vi.advanceTimersByTimeAsync(5000);
			expect(refreshSongInstrumentDetail).toHaveBeenCalledTimes(1);

			// Still in progress, so another poll must have been scheduled automatically.
			await vi.advanceTimersByTimeAsync(5000);
			expect(refreshSongInstrumentDetail).toHaveBeenCalledTimes(2);
			cancelAllSongInstrumentPolls();
		});

		it("cancels the poll and shows the mapped message when the upload failed", async () => {
			vi.useFakeTimers();
			const songs = ref<SongResponse[]>([makeSong()]);
			const { scheduleSongInstrumentPoll, toastStore, getSongInstrumentUploadState } =
				createComposable(songs);
			refreshSongInstrumentDetail.mockResolvedValue(
				makeDetail({
					upload: {
						status: songInstrumentUploadStatuses.FAILED,
						errorMessage: "content-type must be video/mp4",
					},
				}),
			);

			scheduleSongInstrumentPoll("song-1", "instrument-1", 1);
			await vi.advanceTimersByTimeAsync(5000);

			expect(toastStore.toasts[0].message).toBe("The video must be in MP4 format.");
			expect(getSongInstrumentUploadState("song-1", "instrument-1").isSubmitting).toBe(false);
			// No further poll should remain scheduled once the upload failed.
			expect(vi.getTimerCount()).toBe(0);
		});

		it("completes the progress when the video becomes available", async () => {
			vi.useFakeTimers();
			const songs = ref<SongResponse[]>([makeSong()]);
			const { scheduleSongInstrumentPoll, getSongInstrumentUploadState } =
				createComposable(songs);
			const video = {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://example.test/video.mp4",
				duration: 10,
				size: 100,
				createdAt: "2026-07-15T10:00:00.000Z",
			};
			refreshSongInstrumentDetail.mockResolvedValue(makeDetail({ video }));

			scheduleSongInstrumentPoll("song-1", "instrument-1", 1);
			await vi.advanceTimersByTimeAsync(5000);

			const state = getSongInstrumentUploadState("song-1", "instrument-1");
			expect(state.progress).toBe(100);
			expect(state.progressStage).toBe("COMPLETE");
		});
	});

	describe("cancelAllSongInstrumentPolls", () => {
		it("clears every pending poll and progress timer", async () => {
			vi.useFakeTimers();
			const songs = ref<SongResponse[]>([makeSong()]);
			const { scheduleSongInstrumentPoll, startSongInstrumentRequestProgress, cancelAllSongInstrumentPolls } =
				createComposable(songs);

			scheduleSongInstrumentPoll("song-1", "instrument-1", 1);
			startSongInstrumentRequestProgress("song-1", "instrument-1");
			expect(vi.getTimerCount()).toBeGreaterThan(0);

			cancelAllSongInstrumentPolls();

			expect(vi.getTimerCount()).toBe(0);
		});
	});
});

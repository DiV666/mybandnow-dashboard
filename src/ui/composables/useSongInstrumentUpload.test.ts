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
	const cancelSongInstrumentUploadUseCase = { run: vi.fn() };
	const confirmSongInstrumentUploadUseCase = { run: vi.fn() };
	const refreshSongInstrumentDetail = vi.fn();
	const getEffectiveUpload = vi.fn();
	const getEffectiveVideo = vi.fn();
	const getSongInstrument = vi.fn();
	const isSongInstrumentInProgress = vi.fn();

	beforeEach(() => {
		uploadSongInstrumentVideoUseCase.run.mockReset();
		cancelSongInstrumentUploadUseCase.run.mockReset();
		confirmSongInstrumentUploadUseCase.run.mockReset();
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
				cancelSongInstrumentUploadUseCase,
				confirmSongInstrumentUploadUseCase,
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
			const { handleUploadSongInstrumentVideo, handleSongInstrumentVideoSelection, getSongInstrumentUploadState, toastStore } =
				createComposable(songs);
			handleSongInstrumentVideoSelection("song-1", "instrument-1", {
				target: { files: [makeMp4File()] },
			} as unknown as Event);
			uploadSongInstrumentVideoUseCase.run.mockRejectedValue({
				response: { status: 403, data: { message: "some raw backend detail" } },
			});

			await handleUploadSongInstrumentVideo("song-1", "instrument-1");

			const state = getSongInstrumentUploadState("song-1", "instrument-1");
			expect(state.errorMsg).toBe(
				"Only the person assigned to this instrument can upload the video.",
			);
			expect(state.errorMsg).not.toContain("raw backend detail");
			// The upload modal stays open and already surfaces this message; a toast would be redundant.
			expect(toastStore.toasts).toEqual([]);
		});
	});

	describe("getSongInstrumentUploadErrorMessage", () => {
		it.each([
			["UNSUPPORTED_CODEC", "The uploaded video must use H.264 codec."],
			["DURATION_EXCEEDED", "The uploaded video exceeds the maximum duration of 320 seconds."],
			["INVALID_VIDEO_FORMAT", "The uploaded file is not a valid video."],
			["FILE_NOT_FOUND", "The uploaded file could not be found for processing. Please upload it again."],
			["PROCESSING_FAILED", "The uploaded video could not be processed. Please try again."],
		])("translates the %s backend error code", (errorCode, expectedMessage) => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { getSongInstrumentUploadErrorMessage } = createComposable(songs);
			getEffectiveUpload.mockReturnValue({
				status: songInstrumentUploadStatuses.FAILED,
				errorMessage: "raw backend detail that must never reach the UI",
				errorCode,
			});

			const message = getSongInstrumentUploadErrorMessage("song-1", makeInstrument());

			expect(message).toBe(expectedMessage);
		});

		it("falls back to the generic message when the error code is unknown", () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { getSongInstrumentUploadErrorMessage } = createComposable(songs);
			getEffectiveUpload.mockReturnValue({
				status: songInstrumentUploadStatuses.FAILED,
				errorMessage: "some future backend error",
				errorCode: "SOME_FUTURE_CODE",
			});

			const message = getSongInstrumentUploadErrorMessage("song-1", makeInstrument());

			expect(message).toBe("The video upload failed.");
		});
	});

	describe("openSongInstrumentUploadModal / closeSongInstrumentUploadModal", () => {
		it("clears a stale error, progress and selected file left over from a previous failed attempt when opening", () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { openSongInstrumentUploadModal, getSongInstrumentUploadState, setSongInstrumentUploadState } =
				createComposable(songs);
			setSongInstrumentUploadState("song-1", "instrument-1", {
				selectedFile: makeMp4File(),
				errorMsg: "Upload could not be started.",
				progress: 52,
				progressStage: "BACKEND",
			});

			openSongInstrumentUploadModal("song-1", "instrument-1");

			const state = getSongInstrumentUploadState("song-1", "instrument-1");
			expect(state.errorMsg).toBe("");
			expect(state.selectedFile).toBeNull();
			expect(state.progress).toBe(0);
			expect(state.progressStage).toBe("IDLE");
		});

		it("clears the same stale state when closing the modal", () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const {
				openSongInstrumentUploadModal,
				closeSongInstrumentUploadModal,
				getSongInstrumentUploadState,
				setSongInstrumentUploadState,
			} = createComposable(songs);
			openSongInstrumentUploadModal("song-1", "instrument-1");
			setSongInstrumentUploadState("song-1", "instrument-1", {
				selectedFile: makeMp4File(),
				errorMsg: "Upload could not be started.",
				progress: 52,
				progressStage: "BACKEND",
			});

			closeSongInstrumentUploadModal();

			const state = getSongInstrumentUploadState("song-1", "instrument-1");
			expect(state.errorMsg).toBe("");
			expect(state.selectedFile).toBeNull();
			expect(state.progress).toBe(0);
			expect(state.progressStage).toBe("IDLE");
		});

		it("does not reset progress while an upload is still in progress on the backend", () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { openSongInstrumentUploadModal, getSongInstrumentUploadState, setSongInstrumentUploadState } =
				createComposable(songs);
			getSongInstrument.mockReturnValue(
				makeInstrument({ upload: { status: songInstrumentUploadStatuses.PROCESSING } }),
			);
			getEffectiveUpload.mockReturnValue({ status: songInstrumentUploadStatuses.PROCESSING });
			setSongInstrumentUploadState("song-1", "instrument-1", {
				progress: 70,
				progressStage: "BACKEND",
			});

			openSongInstrumentUploadModal("song-1", "instrument-1");

			const state = getSongInstrumentUploadState("song-1", "instrument-1");
			expect(state.progress).toBe(70);
			expect(state.progressStage).toBe("BACKEND");
		});
	});

	describe("canCancelSongInstrumentUpload / handleCancelSongInstrumentUpload", () => {
		it("only allows canceling a PENDING upload that already has an id", () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { canCancelSongInstrumentUpload } = createComposable(songs);
			const instrument = makeInstrument();

			getEffectiveUpload.mockReturnValue(null);
			expect(canCancelSongInstrumentUpload("song-1", instrument)).toBe(false);

			getEffectiveUpload.mockReturnValue({ status: songInstrumentUploadStatuses.PENDING });
			expect(canCancelSongInstrumentUpload("song-1", instrument)).toBe(false);

			getEffectiveUpload.mockReturnValue({
				id: "upload-1",
				status: songInstrumentUploadStatuses.PROCESSING,
			});
			expect(canCancelSongInstrumentUpload("song-1", instrument)).toBe(false);

			getEffectiveUpload.mockReturnValue({
				id: "upload-1",
				status: songInstrumentUploadStatuses.PENDING,
			});
			expect(canCancelSongInstrumentUpload("song-1", instrument)).toBe(true);
		});

		it("cancels the active upload, stops the poll and refreshes the instrument on success", async () => {
			vi.useFakeTimers();
			const songs = ref<SongResponse[]>([makeSong()]);
			const { handleCancelSongInstrumentUpload, getSongInstrumentUploadState, scheduleSongInstrumentPoll } =
				createComposable(songs);
			getSongInstrument.mockReturnValue(makeInstrument());
			getEffectiveUpload.mockReturnValue({
				id: "upload-1",
				status: songInstrumentUploadStatuses.PENDING,
			});
			cancelSongInstrumentUploadUseCase.run.mockResolvedValue(undefined);
			refreshSongInstrumentDetail.mockResolvedValue(makeDetail());
			scheduleSongInstrumentPoll("song-1", "instrument-1", 1);

			await handleCancelSongInstrumentUpload("song-1", "instrument-1");

			expect(cancelSongInstrumentUploadUseCase.run).toHaveBeenCalledWith(
				"song-1",
				"instrument-1",
				"upload-1",
			);
			expect(refreshSongInstrumentDetail).toHaveBeenCalledWith("song-1", "instrument-1");
			const state = getSongInstrumentUploadState("song-1", "instrument-1");
			expect(state.isCancelling).toBe(false);
			expect(state.progressStage).toBe("IDLE");
			// The poll must have been canceled: advancing past the interval triggers nothing further.
			refreshSongInstrumentDetail.mockClear();
			await vi.advanceTimersByTimeAsync(6000);
			expect(refreshSongInstrumentDetail).not.toHaveBeenCalled();
		});

		it("shows a conflict message and does not refresh when the backend already started validating", async () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { handleCancelSongInstrumentUpload, toastStore } = createComposable(songs);
			getSongInstrument.mockReturnValue(makeInstrument());
			getEffectiveUpload.mockReturnValue({
				id: "upload-1",
				status: songInstrumentUploadStatuses.PENDING,
			});
			cancelSongInstrumentUploadUseCase.run.mockRejectedValue({
				response: { status: 409, data: {} },
			});

			await handleCancelSongInstrumentUpload("song-1", "instrument-1");

			expect(toastStore.toasts[0].message).toBe(
				"Validation has already started, the upload can no longer be canceled.",
			);
			expect(refreshSongInstrumentDetail).not.toHaveBeenCalled();
		});

		it("does nothing when the upload is not PENDING", async () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { handleCancelSongInstrumentUpload } = createComposable(songs);
			getSongInstrument.mockReturnValue(makeInstrument());
			getEffectiveUpload.mockReturnValue({
				id: "upload-1",
				status: songInstrumentUploadStatuses.PROCESSING,
			});

			await handleCancelSongInstrumentUpload("song-1", "instrument-1");

			expect(cancelSongInstrumentUploadUseCase.run).not.toHaveBeenCalled();
		});
	});

	describe("syncSongInstrumentAsyncState", () => {
		it("retries the confirm call when it detects a PENDING upload with an id", async () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { syncSongInstrumentAsyncState, getSongInstrumentUploadState } =
				createComposable(songs);
			confirmSongInstrumentUploadUseCase.run.mockResolvedValue(undefined);
			const instrument = makeInstrument({
				upload: { id: "upload-1", status: songInstrumentUploadStatuses.PENDING },
			});

			await syncSongInstrumentAsyncState("song-1", instrument);

			expect(confirmSongInstrumentUploadUseCase.run).toHaveBeenCalledWith(
				"song-1",
				"instrument-1",
				"upload-1",
			);
			expect(getSongInstrumentUploadState("song-1", "instrument-1").progressStage).toBe(
				"BACKEND",
			);
		});

		it("does not fail the sync when the confirm retry is rejected (e.g. already confirmed)", async () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { syncSongInstrumentAsyncState, getSongInstrumentUploadState } =
				createComposable(songs);
			confirmSongInstrumentUploadUseCase.run.mockRejectedValue({
				response: { status: 409, data: {} },
			});
			const instrument = makeInstrument({
				upload: { id: "upload-1", status: songInstrumentUploadStatuses.PENDING },
			});

			await syncSongInstrumentAsyncState("song-1", instrument);

			expect(getSongInstrumentUploadState("song-1", "instrument-1").progressStage).toBe(
				"BACKEND",
			);
			expect(getSongInstrumentUploadState("song-1", "instrument-1").errorMsg).toBe("");
		});

		it("does not retry the confirm call for statuses other than PENDING", async () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { syncSongInstrumentAsyncState } = createComposable(songs);
			const instrument = makeInstrument({
				upload: { id: "upload-1", status: songInstrumentUploadStatuses.PROCESSING },
			});

			await syncSongInstrumentAsyncState("song-1", instrument);

			expect(confirmSongInstrumentUploadUseCase.run).not.toHaveBeenCalled();
		});

		it("does not retry the confirm call when the PENDING upload has no id yet", async () => {
			const songs = ref<SongResponse[]>([makeSong()]);
			const { syncSongInstrumentAsyncState } = createComposable(songs);
			const instrument = makeInstrument({
				upload: { status: songInstrumentUploadStatuses.PENDING },
			});

			await syncSongInstrumentAsyncState("song-1", instrument);

			expect(confirmSongInstrumentUploadUseCase.run).not.toHaveBeenCalled();
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

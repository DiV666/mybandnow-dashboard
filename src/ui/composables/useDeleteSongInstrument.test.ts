import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, ref, type Ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useDeleteSongInstrument } from "./useDeleteSongInstrument.js";
import { useToastStore } from "../stores/useToastStore.js";
import { i18n } from "../../infrastructure/config/i18n.js";
import type { SongInstrumentListItemResponse } from "../../domain/song/SongInstrumentResponse.js";
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
		instrumentId: "",
		...overrides,
	} as SongInstrumentListItemResponse;
}

describe("useDeleteSongInstrument", () => {
	const deleteSongInstrumentUseCase = { run: vi.fn() };

	beforeEach(() => {
		deleteSongInstrumentUseCase.run.mockReset();
		i18n.global.locale.value = "en";
	});

	function createComposable(options: {
		songs?: Ref<SongResponse[]>;
		songInstruments?: Ref<Record<string, SongInstrumentListItemResponse[]>>;
		instrument?: SongInstrumentListItemResponse | null;
	} = {}) {
		const songs = options.songs ?? ref<SongResponse[]>([makeSong()]);
		const instrument = "instrument" in options ? options.instrument : makeInstrument();
		const songInstruments =
			options.songInstruments ?? ref<Record<string, SongInstrumentListItemResponse[]>>({
				"song-1": instrument ? [instrument] : [],
			});
		const getSongInstrument = vi.fn(() => instrument);
		const extractUploadErrorDetails = vi.fn((error: unknown) => {
			if (error && typeof error === "object" && "response" in error) {
				const response = (error as { response?: { status?: number } }).response;
				return { status: response?.status };
			}
			return {};
		});

		let toastStore: ReturnType<typeof useToastStore>;

		const composable = withSetup(() => {
			toastStore = useToastStore();
			return useDeleteSongInstrument({
				deleteSongInstrumentUseCase,
				songs,
				songInstruments,
				getSongInstrument,
				extractUploadErrorDetails,
			});
		});

		return {
			...composable,
			songInstruments,
			getSongInstrument,
			toastStore: toastStore!,
		};
	}

	it("does not open the modal when the instrument can't be found", () => {
		const { openDeleteInstrumentModal, activeDeleteInstrumentModal } = createComposable({
			instrument: null,
		});

		openDeleteInstrumentModal("song-1", "instrument-1");

		expect(activeDeleteInstrumentModal.value).toBeNull();
	});

	it("opens the modal for the selected instrument", () => {
		const { openDeleteInstrumentModal, activeDeleteInstrumentModal } = createComposable();

		openDeleteInstrumentModal("song-1", "instrument-1");

		expect(activeDeleteInstrumentModal.value).toMatchObject({
			songId: "song-1",
			instrumentId: "instrument-1",
			isSubmitting: false,
			errorMsg: "",
		});
	});

	it("deletes the instrument, removes it from the list, closes the modal, and shows a success toast", async () => {
		deleteSongInstrumentUseCase.run.mockResolvedValue(undefined);
		const {
			openDeleteInstrumentModal,
			handleDeleteInstrumentSubmit,
			activeDeleteInstrumentModal,
			songInstruments,
			toastStore,
		} = createComposable();
		openDeleteInstrumentModal("song-1", "instrument-1");

		await handleDeleteInstrumentSubmit();

		expect(deleteSongInstrumentUseCase.run).toHaveBeenCalledWith("song-1", "instrument-1");
		expect(songInstruments.value["song-1"]).toEqual([]);
		expect(activeDeleteInstrumentModal.value).toBeNull();
		expect(toastStore.toasts[0].message).toBe("Instrument deleted successfully.");
	});

	it("keeps the modal open with a mapped permission error when deletion is forbidden", async () => {
		deleteSongInstrumentUseCase.run.mockRejectedValue({ response: { status: 403 } });
		const { openDeleteInstrumentModal, handleDeleteInstrumentSubmit, activeDeleteInstrumentModal, toastStore } =
			createComposable();
		openDeleteInstrumentModal("song-1", "instrument-1");

		await handleDeleteInstrumentSubmit();

		expect(activeDeleteInstrumentModal.value).not.toBeNull();
		expect(activeDeleteInstrumentModal.value?.isSubmitting).toBe(false);
		expect(activeDeleteInstrumentModal.value?.errorMsg).toBe(
			"You don't have permission to delete this instrument.",
		);
		expect(toastStore.toasts[0].message).toBe(
			"You don't have permission to delete this instrument.",
		);
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, ref, type Ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useEditSongInstrument } from "./useEditSongInstrument.js";
import { useToastStore } from "../stores/useToastStore.js";
import { i18n } from "../../infrastructure/config/i18n.js";
import type {
	SongInstrumentDetailResponse,
	SongInstrumentListItemResponse,
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
		instrumentId: "",
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

describe("useEditSongInstrument", () => {
	const getSongInstrumentDetailUseCase = { run: vi.fn() };
	const updateSongInstrumentUseCase = { run: vi.fn() };

	beforeEach(() => {
		getSongInstrumentDetailUseCase.run.mockReset();
		updateSongInstrumentUseCase.run.mockReset();
		i18n.global.locale.value = "en";
	});

	function createComposable(options: {
		songs?: Ref<SongResponse[]>;
		instrument?: SongInstrumentListItemResponse | null;
	} = {}) {
		const songs = options.songs ?? ref<SongResponse[]>([makeSong()]);
		const instrument = options.instrument ?? makeInstrument();
		const getSongInstrument = vi.fn(() => instrument);
		const setSongInstrumentDetail = vi.fn();
		const getSongInstrumentCatalogId = vi.fn(
			(candidate: SongInstrumentListItemResponse | SongInstrumentDetailResponse) =>
				candidate.instrumentId ?? "",
		);
		const ensureCatalogInstrumentNameLoaded = vi.fn().mockResolvedValue(undefined);
		const ensureAvailableInstrumentsLoaded = vi.fn().mockResolvedValue(undefined);
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
			return useEditSongInstrument({
				getSongInstrumentDetailUseCase,
				updateSongInstrumentUseCase,
				songs,
				getSongInstrument,
				setSongInstrumentDetail,
				getSongInstrumentCatalogId,
				ensureCatalogInstrumentNameLoaded,
				ensureAvailableInstrumentsLoaded,
				extractUploadErrorDetails,
			});
		});

		return {
			...composable,
			songs,
			instrument,
			getSongInstrument,
			setSongInstrumentDetail,
			ensureCatalogInstrumentNameLoaded,
			ensureAvailableInstrumentsLoaded,
			toastStore: toastStore!,
		};
	}

	it("opens the modal without loading detail when the catalog instrument is already known", () => {
		const instrument = makeInstrument({ instrumentId: "catalog-1" });
		const { openEditInstrumentModal, activeEditInstrumentModal, ensureAvailableInstrumentsLoaded } =
			createComposable({ instrument });

		openEditInstrumentModal("song-1", "instrument-1");

		expect(activeEditInstrumentModal.value).toMatchObject({
			songId: "song-1",
			instrumentId: "instrument-1",
			name: "Guitar",
			catalogInstrumentId: "catalog-1",
			isLoading: false,
			isSubmitting: false,
			errorMsg: "",
		});
		expect(getSongInstrumentDetailUseCase.run).not.toHaveBeenCalled();
		expect(ensureAvailableInstrumentsLoaded).toHaveBeenCalled();
	});

	it("opens the modal in a loading state and fetches detail when the catalog instrument is unknown", async () => {
		const instrument = makeInstrument({ instrumentId: "" });
		getSongInstrumentDetailUseCase.run.mockResolvedValue(makeDetail());
		const { openEditInstrumentModal, activeEditInstrumentModal, setSongInstrumentDetail } =
			createComposable({ instrument });

		openEditInstrumentModal("song-1", "instrument-1");

		expect(activeEditInstrumentModal.value?.isLoading).toBe(true);
		await vi.waitFor(() => {
			expect(activeEditInstrumentModal.value?.isLoading).toBe(false);
		});
		expect(getSongInstrumentDetailUseCase.run).toHaveBeenCalledWith("song-1", "instrument-1");
		expect(setSongInstrumentDetail).toHaveBeenCalledWith(makeDetail());
		expect(activeEditInstrumentModal.value?.catalogInstrumentId).toBe("catalog-1");
	});

	it("rejects submission with an empty name without calling the use case", async () => {
		const { openEditInstrumentModal, handleEditInstrumentSubmit, activeEditInstrumentModal } =
			createComposable({ instrument: makeInstrument({ instrumentId: "catalog-1", name: "" }) });
		openEditInstrumentModal("song-1", "instrument-1");
		activeEditInstrumentModal.value = { ...activeEditInstrumentModal.value!, name: "   " };

		await handleEditInstrumentSubmit();

		expect(updateSongInstrumentUseCase.run).not.toHaveBeenCalled();
		expect(activeEditInstrumentModal.value?.errorMsg).toBe("Enter a name before saving.");
	});

	it("rejects submission without a selected catalog instrument without calling the use case", async () => {
		const { openEditInstrumentModal, handleEditInstrumentSubmit, activeEditInstrumentModal } =
			createComposable({ instrument: makeInstrument({ instrumentId: "catalog-1" }) });
		openEditInstrumentModal("song-1", "instrument-1");
		activeEditInstrumentModal.value = {
			...activeEditInstrumentModal.value!,
			catalogInstrumentId: "",
			name: "Guitar",
		};

		await handleEditInstrumentSubmit();

		expect(updateSongInstrumentUseCase.run).not.toHaveBeenCalled();
		expect(activeEditInstrumentModal.value?.errorMsg).toBe("Select an instrument before saving.");
	});

	it("submits the update, refreshes the detail, closes the modal, and shows a success toast", async () => {
		const updatedInstrument = makeDetail({ name: "Guitarra", instrumentId: "catalog-2" });
		updateSongInstrumentUseCase.run.mockResolvedValue(updatedInstrument);
		const {
			openEditInstrumentModal,
			handleEditInstrumentSubmit,
			activeEditInstrumentModal,
			setSongInstrumentDetail,
			ensureCatalogInstrumentNameLoaded,
			toastStore,
		} = createComposable({ instrument: makeInstrument({ instrumentId: "catalog-1" }) });
		openEditInstrumentModal("song-1", "instrument-1");

		await handleEditInstrumentSubmit();

		expect(updateSongInstrumentUseCase.run).toHaveBeenCalledWith(
			"song-1",
			"instrument-1",
			"Guitar",
			"catalog-1",
		);
		expect(setSongInstrumentDetail).toHaveBeenCalledWith(updatedInstrument);
		expect(ensureCatalogInstrumentNameLoaded).toHaveBeenCalledWith("catalog-2");
		expect(activeEditInstrumentModal.value).toBeNull();
		expect(toastStore.toasts[0].message).toBe("Instrument updated successfully.");
	});

	it("keeps the modal open with a mapped error message when the update fails", async () => {
		updateSongInstrumentUseCase.run.mockRejectedValue({ response: { status: 403 } });
		const { openEditInstrumentModal, handleEditInstrumentSubmit, activeEditInstrumentModal, toastStore } =
			createComposable({ instrument: makeInstrument({ instrumentId: "catalog-1" }) });
		openEditInstrumentModal("song-1", "instrument-1");

		await handleEditInstrumentSubmit();

		expect(activeEditInstrumentModal.value).not.toBeNull();
		expect(activeEditInstrumentModal.value?.isSubmitting).toBe(false);
		expect(activeEditInstrumentModal.value?.errorMsg).toBe(
			"You don't have permission to edit this instrument.",
		);
		expect(activeEditInstrumentModal.value?.errorMsg).not.toContain("response");
		expect(toastStore.toasts[0].message).toBe(
			"You don't have permission to edit this instrument.",
		);
	});

	it("updates the name and clears the error on input", () => {
		const { openEditInstrumentModal, handleEditInstrumentNameInput, activeEditInstrumentModal } =
			createComposable({ instrument: makeInstrument({ instrumentId: "catalog-1" }) });
		openEditInstrumentModal("song-1", "instrument-1");
		activeEditInstrumentModal.value = { ...activeEditInstrumentModal.value!, errorMsg: "previous error" };

		handleEditInstrumentNameInput({ target: { value: "New Name" } } as unknown as Event);

		expect(activeEditInstrumentModal.value?.name).toBe("New Name");
		expect(activeEditInstrumentModal.value?.errorMsg).toBe("");
	});

	it("updates the catalog instrument and clears the error on input", () => {
		const { openEditInstrumentModal, handleEditInstrumentCatalogInput, activeEditInstrumentModal } =
			createComposable({ instrument: makeInstrument({ instrumentId: "catalog-1" }) });
		openEditInstrumentModal("song-1", "instrument-1");
		activeEditInstrumentModal.value = { ...activeEditInstrumentModal.value!, errorMsg: "previous error" };

		handleEditInstrumentCatalogInput({ target: { value: "catalog-2" } } as unknown as Event);

		expect(activeEditInstrumentModal.value?.catalogInstrumentId).toBe("catalog-2");
		expect(activeEditInstrumentModal.value?.errorMsg).toBe("");
	});
});

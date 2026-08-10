import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, ref, type Ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useAddSongInstrument } from "./useAddSongInstrument.js";
import { useMusicianStore } from "../stores/useMusicianStore.js";
import { useToastStore } from "../stores/useToastStore.js";
import { i18n } from "../../infrastructure/config/i18n.js";
import { ValidationError } from "../../domain/shared/ValidationError.js";
import type { SongInstrumentListItemResponse } from "../../domain/song/SongInstrumentResponse.js";
import type { SongResponse } from "../../domain/song/SongResponse.js";

type TestNode = { type: string; parent: TestNode | null; children: TestNode[] };

// Vue's custom renderer allows mounting a real component instance without a DOM,
// which is required for `useI18n()`/`useMusicianStore()`/`useToastStore()` to resolve their component context.
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
		musicianId: "",
		...overrides,
	} as SongInstrumentListItemResponse;
}

describe("useAddSongInstrument", () => {
	const createSongInstrumentUseCase = { run: vi.fn() };
	const getSongInstrumentsUseCase = { run: vi.fn() };

	beforeEach(() => {
		createSongInstrumentUseCase.run.mockReset();
		getSongInstrumentsUseCase.run.mockReset();
		i18n.global.locale.value = "en";
	});

	function createComposable(songs: Ref<SongResponse[]>) {
		const songInstruments = ref<Record<string, SongInstrumentListItemResponse[]>>({});
		const ensureAvailableInstrumentsLoaded = vi.fn().mockResolvedValue(undefined);
		const preloadCatalogInstrumentNames = vi.fn().mockResolvedValue(undefined);
		const syncSongInstrumentAsyncState = vi.fn().mockResolvedValue(undefined);
		let musicianStore: ReturnType<typeof useMusicianStore>;
		let toastStore: ReturnType<typeof useToastStore>;

		const composable = withSetup(() => {
			musicianStore = useMusicianStore();
			toastStore = useToastStore();
			return useAddSongInstrument({
				createSongInstrumentUseCase,
				getSongInstrumentsUseCase,
				songs,
				songInstruments,
				ensureAvailableInstrumentsLoaded,
				preloadCatalogInstrumentNames,
				syncSongInstrumentAsyncState,
			});
		});

		return {
			...composable,
			songInstruments,
			ensureAvailableInstrumentsLoaded,
			preloadCatalogInstrumentNames,
			syncSongInstrumentAsyncState,
			musicianStore: musicianStore!,
			toastStore: toastStore!,
		};
	}

	function withMusicianProfile(musicianStore: ReturnType<typeof useMusicianStore>) {
		musicianStore.profile = {
			id: "musician-1",
			userId: "user-1",
			username: "musician",
			name: "Musician Name",
		};
	}

	it("opens the form for the target song and hides the others", () => {
		const songs = ref<SongResponse[]>([makeSong({ id: "song-1" }), makeSong({ id: "song-2" })]);
		const { openSongInstrumentForm, songInstrumentForms } = createComposable(songs);
		openSongInstrumentForm("song-1");

		openSongInstrumentForm("song-2");

		expect(songInstrumentForms.value["song-1"].isVisible).toBe(false);
		expect(songInstrumentForms.value["song-2"].isVisible).toBe(true);
	});

	it("requires a musician profile before creating an instrument", async () => {
		const songs = ref<SongResponse[]>([makeSong({ id: "song-1" })]);
		const { handleCreateSongInstrument, toastStore } = createComposable(songs);

		await handleCreateSongInstrument("song-1");

		expect(createSongInstrumentUseCase.run).not.toHaveBeenCalled();
		expect(toastStore.toasts[0].message).toBe(
			"You must complete your musician profile to add instruments.",
		);
	});

	it("creates the instrument, reloads the song instruments, and resets the form on success", async () => {
		const songs = ref<SongResponse[]>([makeSong({ id: "song-1" })]);
		const {
			handleCreateSongInstrument,
			openSongInstrumentForm,
			songInstrumentForms,
			songInstruments,
			musicianStore,
			preloadCatalogInstrumentNames,
			syncSongInstrumentAsyncState,
		} = createComposable(songs);
		withMusicianProfile(musicianStore);
		openSongInstrumentForm("song-1");
		songInstrumentForms.value["song-1"].name = "Solo";
		songInstrumentForms.value["song-1"].instrumentId = "instrument-1";
		const instruments = [makeInstrument({ id: "instrument-1" })];
		createSongInstrumentUseCase.run.mockResolvedValue(undefined);
		getSongInstrumentsUseCase.run.mockResolvedValue(instruments);

		await handleCreateSongInstrument("song-1");

		expect(createSongInstrumentUseCase.run).toHaveBeenCalledWith(
			"song-1",
			expect.any(String),
			"Solo",
			"instrument-1",
			"musician-1",
		);
		expect(songInstruments.value["song-1"]).toEqual(instruments);
		expect(preloadCatalogInstrumentNames).toHaveBeenCalledWith(instruments);
		expect(syncSongInstrumentAsyncState).toHaveBeenCalledWith("song-1", instruments[0]);
		expect(songInstrumentForms.value["song-1"]).toMatchObject({
			isVisible: false,
			name: "",
			instrumentId: "",
			isSubmitting: false,
		});
	});

	it("shows a conflict message on a 409 error", async () => {
		const songs = ref<SongResponse[]>([makeSong({ id: "song-1" })]);
		const { handleCreateSongInstrument, songInstrumentForms, musicianStore } =
			createComposable(songs);
		withMusicianProfile(musicianStore);
		createSongInstrumentUseCase.run.mockRejectedValue({ response: { status: 409 } });

		await handleCreateSongInstrument("song-1");

		expect(songInstrumentForms.value["song-1"].errorMsg).toBe(
			"An instrument with that data already exists for this song. Please try again.",
		);
	});

	it("shows a permission message on a 403 error", async () => {
		const songs = ref<SongResponse[]>([makeSong({ id: "song-1" })]);
		const { handleCreateSongInstrument, songInstrumentForms, musicianStore } =
			createComposable(songs);
		withMusicianProfile(musicianStore);
		createSongInstrumentUseCase.run.mockRejectedValue({ response: { status: 403 } });

		await handleCreateSongInstrument("song-1");

		expect(songInstrumentForms.value["song-1"].errorMsg).toBe(
			"You don't have permission to add instruments to this song.",
		);
	});

	it("shows the raw message for a domain ValidationError", async () => {
		const songs = ref<SongResponse[]>([makeSong({ id: "song-1" })]);
		const { handleCreateSongInstrument, songInstrumentForms, musicianStore } =
			createComposable(songs);
		withMusicianProfile(musicianStore);
		createSongInstrumentUseCase.run.mockRejectedValue(
			new ValidationError("SongInstrumentName cannot be empty"),
		);

		await handleCreateSongInstrument("song-1");

		expect(songInstrumentForms.value["song-1"].errorMsg).toBe(
			"SongInstrumentName cannot be empty",
		);
	});

	it("shows a generic fallback message for a non-ValidationError without leaking its raw text", async () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const songs = ref<SongResponse[]>([makeSong({ id: "song-1" })]);
		const { handleCreateSongInstrument, songInstrumentForms, musicianStore } =
			createComposable(songs);
		withMusicianProfile(musicianStore);
		createSongInstrumentUseCase.run.mockRejectedValue(new Error("internal backend detail"));

		await handleCreateSongInstrument("song-1");

		expect(songInstrumentForms.value["song-1"].errorMsg).toBe(
			"An unexpected error occurred while adding the instrument.",
		);
		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

		consoleErrorSpy.mockRestore();
	});
});

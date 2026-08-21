import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, ref, type Ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useDeleteSong } from "./useDeleteSong.js";
import { useToastStore } from "../stores/useToastStore.js";
import { i18n } from "../../infrastructure/config/i18n.js";
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

describe("useDeleteSong", () => {
	const deleteSongUseCase = { run: vi.fn() };

	beforeEach(() => {
		deleteSongUseCase.run.mockReset();
		i18n.global.locale.value = "en";
	});

	function createComposable(options: { songs?: Ref<SongResponse[]> } = {}) {
		const songs = options.songs ?? ref<SongResponse[]>([makeSong()]);
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
			return useDeleteSong({
				deleteSongUseCase,
				songs,
				extractUploadErrorDetails,
			});
		});

		return {
			...composable,
			songs,
			toastStore: toastStore!,
		};
	}

	it("does not open the modal for a song that isn't in the list", () => {
		const { openDeleteSongModal, activeDeleteSongModal } = createComposable({
			songs: ref<SongResponse[]>([]),
		});

		openDeleteSongModal("song-1");

		expect(activeDeleteSongModal.value).toBeNull();
	});

	it("opens the modal for the selected song", () => {
		const { openDeleteSongModal, activeDeleteSongModal } = createComposable();

		openDeleteSongModal("song-1");

		expect(activeDeleteSongModal.value).toMatchObject({
			songId: "song-1",
			isSubmitting: false,
			errorMsg: "",
		});
	});

	it("deletes the song, removes it from the list, closes the modal, and shows a success toast", async () => {
		deleteSongUseCase.run.mockResolvedValue(undefined);
		const { openDeleteSongModal, handleDeleteSongSubmit, activeDeleteSongModal, songs, toastStore } =
			createComposable();
		openDeleteSongModal("song-1");

		await handleDeleteSongSubmit();

		expect(deleteSongUseCase.run).toHaveBeenCalledWith("song-1");
		expect(songs.value).toEqual([]);
		expect(activeDeleteSongModal.value).toBeNull();
		expect(toastStore.toasts[0].message).toBe("Song deleted successfully.");
	});

	it("keeps the modal open with a mapped permission error when deletion is forbidden", async () => {
		deleteSongUseCase.run.mockRejectedValue({ response: { status: 403 } });
		const { openDeleteSongModal, handleDeleteSongSubmit, activeDeleteSongModal, toastStore } =
			createComposable();
		openDeleteSongModal("song-1");

		await handleDeleteSongSubmit();

		expect(activeDeleteSongModal.value).not.toBeNull();
		expect(activeDeleteSongModal.value?.isSubmitting).toBe(false);
		expect(activeDeleteSongModal.value?.errorMsg).toBe(
			"You don't have permission to delete this song.",
		);
		expect(toastStore.toasts[0].message).toBe(
			"You don't have permission to delete this song.",
		);
	});
});

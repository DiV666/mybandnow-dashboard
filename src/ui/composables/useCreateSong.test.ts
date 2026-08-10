import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { computed, createRenderer, ref, type ComputedRef } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useCreateSong } from "./useCreateSong.js";
import { CreateSongUseCase } from "../../application/song/CreateSongUseCase.js";
import { Band } from "../../domain/band/Band.js";
import { BandId } from "../../domain/band/value-object/BandId.js";
import { BandName } from "../../domain/band/value-object/BandName.js";
import { i18n } from "../../infrastructure/config/i18n.js";
import { ValidationError } from "../../domain/shared/ValidationError.js";
import { useToastStore } from "../stores/useToastStore.js";

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

function makeBand(id = "band-1"): Band {
	return Band.create(new BandId(id), new BandName("Test Band"));
}

describe("useCreateSong", () => {
	const createSongUseCase = mock<CreateSongUseCase>();

	beforeEach(() => {
		mockReset(createSongUseCase);
		i18n.global.locale.value = "en";
	});

	function createComposable(selectedBand: ComputedRef<Band | null>, onCreated = vi.fn().mockResolvedValue(undefined)) {
		const composable = withSetup(() =>
			useCreateSong({ createSongUseCase, selectedBand, onCreated }),
		);
		return { ...composable, onCreated };
	}

	it("does not open the create song modal when no band is selected", () => {
		const selectedBand = computed<Band | null>(() => null);
		const { openCreateSongModal, isCreateSongModalOpen } = createComposable(selectedBand);

		openCreateSongModal();

		expect(isCreateSongModalOpen.value).toBe(false);
	});

	it("does not open the create song modal while a creation request is in progress", () => {
		const selectedBand = computed<Band | null>(() => makeBand());
		const { openCreateSongModal, isCreateSongModalOpen, isLoading } = createComposable(selectedBand);
		isLoading.value = true;

		openCreateSongModal();

		expect(isCreateSongModalOpen.value).toBe(false);
	});

	it("opens the create song modal when a band is selected and no request is in progress", () => {
		const selectedBand = computed<Band | null>(() => makeBand());
		const { openCreateSongModal, isCreateSongModalOpen } = createComposable(selectedBand);

		openCreateSongModal();

		expect(isCreateSongModalOpen.value).toBe(true);
	});

	it("creates the song, resets the form, closes the modal, and calls onCreated with the band id", async () => {
		createSongUseCase.run.mockResolvedValue(undefined);
		const selectedBand = computed<Band | null>(() => makeBand("band-1"));
		const onCreated = vi.fn().mockResolvedValue(undefined);
		const { title, originalVideoclipUrl, isCreateSongModalOpen, handleCreateSong } =
			createComposable(selectedBand, onCreated);
		title.value = "My Song";
		originalVideoclipUrl.value = "https://example.com/video.mp4";
		isCreateSongModalOpen.value = true;

		await handleCreateSong();

		expect(createSongUseCase.run).toHaveBeenCalledWith(
			"band-1",
			expect.any(String),
			"My Song",
			"https://example.com/video.mp4",
		);
		expect(title.value).toBe("");
		expect(originalVideoclipUrl.value).toBe("");
		expect(isCreateSongModalOpen.value).toBe(false);
		expect(onCreated).toHaveBeenCalledWith("band-1");
	});

	it("sets a conflict message and keeps the modal open on a 409 error", async () => {
		createSongUseCase.run.mockRejectedValue({ response: { status: 409 } });
		const selectedBand = computed<Band | null>(() => makeBand());
		const { isCreateSongModalOpen, errorMsg, handleCreateSong } = createComposable(selectedBand);
		isCreateSongModalOpen.value = true;

		await handleCreateSong();

		expect(errorMsg.value).toBe("A song with that data already exists. Please try again.");
		expect(isCreateSongModalOpen.value).toBe(true);
	});

	it("shows the raw message for a domain ValidationError", async () => {
		createSongUseCase.run.mockRejectedValue(new ValidationError("SongTitle cannot be empty"));
		const selectedBand = computed<Band | null>(() => makeBand());
		const { errorMsg, handleCreateSong } = createComposable(selectedBand);

		await handleCreateSong();

		expect(errorMsg.value).toBe("SongTitle cannot be empty");
	});

	it("sets a generic fallback message from a generic Error without leaking its raw text", async () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		createSongUseCase.run.mockRejectedValue(new Error("boom"));
		const selectedBand = computed<Band | null>(() => makeBand());
		const { errorMsg, handleCreateSong } = createComposable(selectedBand);

		await handleCreateSong();

		expect(errorMsg.value).toBe("An unexpected error occurred while creating the song.");
		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

		consoleErrorSpy.mockRestore();
	});

	it("sets a generic fallback message for a non-Error rejection", async () => {
		createSongUseCase.run.mockRejectedValue("unexpected");
		const selectedBand = computed<Band | null>(() => makeBand());
		const { errorMsg, handleCreateSong } = createComposable(selectedBand);

		await handleCreateSong();

		expect(errorMsg.value).toBe("An unexpected error occurred while creating the song.");
	});

	it("does not call onCreated when the selected band changed while the request was in flight", async () => {
		let resolveRun: () => void = () => {};
		createSongUseCase.run.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRun = () => resolve(undefined);
				}),
		);
		const currentBand = ref<Band | null>(makeBand("band-1"));
		const selectedBand = computed<Band | null>(() => currentBand.value);
		const onCreated = vi.fn().mockResolvedValue(undefined);
		const { handleCreateSong } = createComposable(selectedBand, onCreated);

		const submission = handleCreateSong();
		currentBand.value = makeBand("band-2");
		resolveRun();
		await submission;

		expect(onCreated).not.toHaveBeenCalled();
	});

	it("shows a toast on success", async () => {
		createSongUseCase.run.mockResolvedValue(undefined);
		const selectedBand = computed<Band | null>(() => makeBand());
		let toastStore: ReturnType<typeof useToastStore>;
		const { handleCreateSong } = withSetup(() => {
			toastStore = useToastStore();
			return useCreateSong({ createSongUseCase, selectedBand, onCreated: vi.fn().mockResolvedValue(undefined) });
		});

		await handleCreateSong();

		expect(toastStore!.toasts).toHaveLength(1);
		expect(toastStore!.toasts[0].variant).toBe("success");
	});
});

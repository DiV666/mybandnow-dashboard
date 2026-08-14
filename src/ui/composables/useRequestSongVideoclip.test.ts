import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { createRenderer } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useRequestSongVideoclip } from "./useRequestSongVideoclip.js";
import { RequestSongVideoclipUseCase } from "../../application/song/RequestSongVideoclipUseCase.js";
import { i18n } from "../../infrastructure/config/i18n.js";
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

describe("useRequestSongVideoclip", () => {
	const requestSongVideoclipUseCase = mock<RequestSongVideoclipUseCase>();

	beforeEach(() => {
		mockReset(requestSongVideoclipUseCase);
		i18n.global.locale.value = "en";
	});

	function createComposable() {
		let toastStore: ReturnType<typeof useToastStore>;
		const composable = withSetup(() => {
			toastStore = useToastStore();
			return useRequestSongVideoclip({ requestSongVideoclipUseCase });
		});
		return { ...composable, toastStore: toastStore! };
	}

	it("requests the videoclip generation and shows a success toast", async () => {
		requestSongVideoclipUseCase.run.mockResolvedValue(undefined);
		const { requestSongVideoclip, isRequestingVideoclip, toastStore } = createComposable();

		await requestSongVideoclip("song-1");

		expect(requestSongVideoclipUseCase.run).toHaveBeenCalledWith("song-1");
		expect(isRequestingVideoclip("song-1")).toBe(false);
		expect(toastStore.toasts).toHaveLength(1);
		expect(toastStore.toasts[0].variant).toBe("success");
		expect(toastStore.toasts[0].message).toBe("Videoclip generation started successfully.");
	});

	it("shows the missing-uploads message on a 400 response", async () => {
		requestSongVideoclipUseCase.run.mockRejectedValue({ response: { status: 400 } });
		const { requestSongVideoclip, toastStore } = createComposable();

		await requestSongVideoclip("song-1");

		expect(toastStore.toasts[0].message).toBe(
			"All the song's instruments must have an uploaded video before generating the videoclip.",
		);
	});

	it("shows the missing-uploads message on a 409 response", async () => {
		requestSongVideoclipUseCase.run.mockRejectedValue({ response: { status: 409 } });
		const { requestSongVideoclip, toastStore } = createComposable();

		await requestSongVideoclip("song-1");

		expect(toastStore.toasts[0].message).toBe(
			"All the song's instruments must have an uploaded video before generating the videoclip.",
		);
	});

	it("shows the permission message on a 401 response", async () => {
		requestSongVideoclipUseCase.run.mockRejectedValue({ response: { status: 401 } });
		const { requestSongVideoclip, toastStore } = createComposable();

		await requestSongVideoclip("song-1");

		expect(toastStore.toasts[0].message).toBe(
			"You don't have permission to generate the videoclip for this song.",
		);
	});

	it("shows the permission message on a 403 response", async () => {
		requestSongVideoclipUseCase.run.mockRejectedValue({ response: { status: 403 } });
		const { requestSongVideoclip, toastStore } = createComposable();

		await requestSongVideoclip("song-1");

		expect(toastStore.toasts[0].message).toBe(
			"You don't have permission to generate the videoclip for this song.",
		);
	});

	it("shows the song-not-found message on a 404 response", async () => {
		requestSongVideoclipUseCase.run.mockRejectedValue({ response: { status: 404 } });
		const { requestSongVideoclip, toastStore } = createComposable();

		await requestSongVideoclip("song-1");

		expect(toastStore.toasts[0].message).toBe(
			"We couldn't find the song you were trying to generate a videoclip for.",
		);
	});

	it("shows a generic fallback message without leaking the raw error on a 500 response", async () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const error = { response: { status: 500 } };
		requestSongVideoclipUseCase.run.mockRejectedValue(error);
		const { requestSongVideoclip, toastStore } = createComposable();

		await requestSongVideoclip("song-1");

		expect(toastStore.toasts[0].message).toBe(
			"An unexpected error occurred while generating the videoclip.",
		);
		expect(consoleErrorSpy).toHaveBeenCalledWith(error);

		consoleErrorSpy.mockRestore();
	});

	it("shows a generic fallback message for a non-http rejection", async () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		requestSongVideoclipUseCase.run.mockRejectedValue(new Error("network down"));
		const { requestSongVideoclip, toastStore } = createComposable();

		await requestSongVideoclip("song-1");

		expect(toastStore.toasts[0].message).toBe(
			"An unexpected error occurred while generating the videoclip.",
		);

		consoleErrorSpy.mockRestore();
	});

	it("does not trigger a second request for the same song while one is in flight", async () => {
		let resolveRun: () => void = () => {};
		requestSongVideoclipUseCase.run.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRun = () => resolve(undefined);
				}),
		);
		const { requestSongVideoclip, isRequestingVideoclip } = createComposable();

		const firstCall = requestSongVideoclip("song-1");
		expect(isRequestingVideoclip("song-1")).toBe(true);

		const secondCall = requestSongVideoclip("song-1");
		resolveRun();
		await Promise.all([firstCall, secondCall]);

		expect(requestSongVideoclipUseCase.run).toHaveBeenCalledTimes(1);
		expect(isRequestingVideoclip("song-1")).toBe(false);
	});
});

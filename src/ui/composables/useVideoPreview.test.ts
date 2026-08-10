import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer } from "vue";
import { useVideoPreview } from "./useVideoPreview.js";
import { i18n } from "../../infrastructure/config/i18n.js";
import type {
	SongInstrumentListItemResponse,
	SongInstrumentVideoResponse,
} from "../../domain/song/SongInstrumentResponse.js";
import type { SongResponse } from "../../domain/song/SongResponse.js";

type TestNode = { type: string; parent: TestNode | null; children: TestNode[] };

// Vue's custom renderer allows mounting a real component instance without a DOM,
// which is required for `useI18n()` to resolve its component context.
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
	const app = renderer.createApp({
		setup() {
			result = composable();
			return () => null;
		},
	});
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

describe("useVideoPreview", () => {
	beforeEach(() => {
		i18n.global.locale.value = "en";
	});

	function createComposable(
		getEffectiveVideo: (songId: string, instrumentId: string) => SongInstrumentVideoResponse | null,
		getSongInstrumentDisplayName: (instrument: SongInstrumentListItemResponse) => string,
	) {
		return withSetup(() =>
			useVideoPreview({ getEffectiveVideo, getSongInstrumentDisplayName }),
		);
	}

	it("fills activeVideoPreview with the video url and translated title when a video is available", () => {
		const getEffectiveVideo = vi.fn().mockReturnValue({ url: "https://example.com/video.mp4" });
		const getSongInstrumentDisplayName = vi.fn().mockReturnValue("Guitar");
		const { activeVideoPreview, openVideoPreview } = createComposable(
			getEffectiveVideo,
			getSongInstrumentDisplayName,
		);
		const song = makeSong({ id: "song-1", title: "My Song" });
		const instrument = makeInstrument({ id: "instrument-1" });

		openVideoPreview(song, instrument);

		expect(getEffectiveVideo).toHaveBeenCalledWith("song-1", "instrument-1");
		expect(activeVideoPreview.value).toEqual({
			url: "https://example.com/video.mp4",
			title: "My Song · Guitar",
		});
	});

	it("does nothing when no video is available", () => {
		const getEffectiveVideo = vi.fn().mockReturnValue(null);
		const getSongInstrumentDisplayName = vi.fn().mockReturnValue("Guitar");
		const { activeVideoPreview, openVideoPreview } = createComposable(
			getEffectiveVideo,
			getSongInstrumentDisplayName,
		);
		const song = makeSong();
		const instrument = makeInstrument();

		openVideoPreview(song, instrument);

		expect(activeVideoPreview.value).toBeNull();
		expect(getSongInstrumentDisplayName).not.toHaveBeenCalled();
	});

	it("clears activeVideoPreview on close", () => {
		const getEffectiveVideo = vi.fn().mockReturnValue({ url: "https://example.com/video.mp4" });
		const getSongInstrumentDisplayName = vi.fn().mockReturnValue("Guitar");
		const { activeVideoPreview, openVideoPreview, closeVideoPreview } = createComposable(
			getEffectiveVideo,
			getSongInstrumentDisplayName,
		);
		openVideoPreview(makeSong(), makeInstrument());
		expect(activeVideoPreview.value).not.toBeNull();

		closeVideoPreview();

		expect(activeVideoPreview.value).toBeNull();
	});
});

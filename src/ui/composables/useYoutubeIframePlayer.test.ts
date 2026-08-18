import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer } from "vue";
import { useYoutubeIframePlayer } from "./useYoutubeIframePlayer.js";

type TestNode = { type: string; parent: TestNode | null; children: TestNode[] };

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

function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
	let result: T;
	const app = renderer.createApp({
		setup() {
			result = composable();
			return () => null;
		},
	});
	const root = { type: "root", parent: null, children: [] };
	app.mount(root);
	return {
		result: result!,
		unmount: () => app.unmount(),
	};
}

class FakeYtPlayer {
	currentTimeSec = 0;
	mutedState = false;
	playCalls = 0;
	pauseCalls = 0;
	destroyCalls = 0;
	onReady: ((event: { target: FakeYtPlayer }) => void) | undefined;
	elementId: string;
	options: {
		videoId: string;
		events?: { onReady?: (event: { target: FakeYtPlayer }) => void };
	};

	constructor(
		elementId: string,
		options: {
			videoId: string;
			events?: { onReady?: (event: { target: FakeYtPlayer }) => void };
		},
	) {
		this.elementId = elementId;
		this.options = options;
		this.onReady = options.events?.onReady;
	}

	getCurrentTime(): number {
		return this.currentTimeSec;
	}

	seekTo(seconds: number): void {
		this.currentTimeSec = seconds;
	}

	isMuted(): boolean {
		return this.mutedState;
	}

	mute(): void {
		this.mutedState = true;
	}

	unMute(): void {
		this.mutedState = false;
	}

	playVideo(): void {
		this.playCalls += 1;
	}

	pauseVideo(): void {
		this.pauseCalls += 1;
	}

	destroy(): void {
		this.destroyCalls += 1;
	}

	fireReady(): void {
		this.onReady?.({ target: this });
	}
}

describe("useYoutubeIframePlayer", () => {
	let createdPlayers: FakeYtPlayer[] = [];

	beforeEach(() => {
		createdPlayers = [];
		vi.stubGlobal("YT", {
			Player: class extends FakeYtPlayer {
				constructor(elementId: string, options: never) {
					super(elementId, options);
					createdPlayers.push(this);
				}
			},
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("creates a YT.Player against the given element and video id", async () => {
		const { result } = withSetup(() => useYoutubeIframePlayer());

		const playerPromise = result.createYoutubePlayer("yt-container", "abc123");
		await vi.waitFor(() => expect(createdPlayers).toHaveLength(1));
		createdPlayers[0]?.fireReady();
		await playerPromise;

		expect(createdPlayers).toHaveLength(1);
		expect(createdPlayers[0]?.elementId).toBe("yt-container");
		expect(createdPlayers[0]?.options.videoId).toBe("abc123");
	});

	it("resolves an adapter that proxies currentTime, muted, play and pause to the YT player", async () => {
		const { result } = withSetup(() => useYoutubeIframePlayer());

		const playerPromise = result.createYoutubePlayer("yt-container", "abc123");
		await vi.waitFor(() => expect(createdPlayers).toHaveLength(1));
		const fakePlayer = createdPlayers[0]!;
		fakePlayer.fireReady();
		const adapter = await playerPromise;

		adapter.currentTime = 42;
		expect(fakePlayer.currentTimeSec).toBe(42);
		expect(adapter.currentTime).toBe(42);

		adapter.muted = true;
		expect(fakePlayer.mutedState).toBe(true);
		expect(adapter.muted).toBe(true);

		adapter.muted = false;
		expect(fakePlayer.mutedState).toBe(false);

		adapter.play();
		expect(fakePlayer.playCalls).toBe(1);

		adapter.pause();
		expect(fakePlayer.pauseCalls).toBe(1);
	});

	it("destroys the underlying player when the owning component unmounts", async () => {
		const { result, unmount } = withSetup(() => useYoutubeIframePlayer());

		const playerPromise = result.createYoutubePlayer("yt-container", "abc123");
		await vi.waitFor(() => expect(createdPlayers).toHaveLength(1));
		const fakePlayer = createdPlayers[0]!;
		fakePlayer.fireReady();
		await playerPromise;

		unmount();

		expect(fakePlayer.destroyCalls).toBe(1);
	});
});

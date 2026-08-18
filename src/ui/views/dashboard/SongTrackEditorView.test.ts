import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, nextTick } from "vue";
import { SongId } from "@/domain/song/value-object/SongId.js";
import { SongInstrumentId } from "@/domain/song/value-object/SongInstrumentId.js";

type UpdateVideoPayload = {
	startTimeMs: number;
};

const {
	routeState,
	routerPushMock,
	repositoryGetInstrumentsBySongIdMock,
	repositoryGetInstrumentByIdMock,
	repositoryUpdateInstrumentVideoStartTimeMock,
	localStorageState,
	elementClientWidthState,
	elementBoundingWidthState,
	bootstrapTooltipCtor,
	bootstrapTooltipDisposeMock,
} = vi.hoisted(() => ({
	routeState: {
		params: {
			songId: "song-123",
		},
		query: {
			title: "Paint It Black",
			originalVideoClipDurationSeconds: undefined,
		} as Record<string, string | undefined>,
	},
	routerPushMock: vi.fn<(location: unknown) => Promise<void>>(),
	repositoryGetInstrumentsBySongIdMock:
		vi.fn<(songId: SongId) => Promise<unknown[]>>(),
	repositoryGetInstrumentByIdMock:
		vi.fn<
			(songId: SongId, instrumentId: SongInstrumentId) => Promise<unknown>
		>(),
	repositoryUpdateInstrumentVideoStartTimeMock:
		vi.fn<
			(
				songId: SongId,
				instrumentId: SongInstrumentId,
				payload: UpdateVideoPayload,
			) => Promise<void>
		>(),
	localStorageState: new Map<string, string>(),
	elementClientWidthState: {
		value: 720,
	},
	elementBoundingWidthState: {
		value: 720,
	},
	bootstrapTooltipCtor: vi.fn<(element: unknown) => void>(),
	bootstrapTooltipDisposeMock: vi.fn<() => void>(),
}));

vi.mock("vue-router", () => ({
	useRoute: () => routeState,
	useRouter: () => ({
		push: routerPushMock,
	}),
}));

vi.mock("../../../infrastructure/song/AxiosSongRepository.js", () => ({
	AxiosSongRepository: class {
		getInstrumentsBySongId(songId: SongId): Promise<unknown[]> {
			return repositoryGetInstrumentsBySongIdMock(songId);
		}

		getInstrumentById(
			songId: SongId,
			instrumentId: SongInstrumentId,
		): Promise<unknown> {
			return repositoryGetInstrumentByIdMock(songId, instrumentId);
		}

		updateInstrumentVideoStartTime(
			songId: SongId,
			instrumentId: SongInstrumentId,
			payload: UpdateVideoPayload,
		): Promise<void> {
			return repositoryUpdateInstrumentVideoStartTimeMock(
				songId,
				instrumentId,
				payload,
			);
		}
	},
}));

vi.mock("bootstrap", () => ({
	Tooltip: class {
		static getOrCreateInstance(element: unknown) {
			bootstrapTooltipCtor(element);
			return {
				dispose: bootstrapTooltipDisposeMock,
			};
		}
	},
}));

import SongTrackEditorView from "./SongTrackEditorView.vue";
import { i18n } from "../../../infrastructure/config/i18n.js";

type PointerCaptureLike = {
	setPointerCapture?: (pointerId: number) => void;
	releasePointerCapture?: (pointerId: number) => void;
};

type TestTextNode = {
	type: "text" | "comment" | "static";
	text: string;
	parent: TestElementNode | null;
};

type TestEvent = {
	type: string;
	target?: unknown;
	clientX?: number;
	pointerId?: number;
	currentTarget?: PointerCaptureLike;
	preventDefault?: () => void;
};

type TestElementNode = {
	type: string;
	props: Record<string, unknown>;
	children: TestNode[];
	text: string;
	parent: TestElementNode | null;
	listeners: Record<string, Array<(event: TestEvent) => void>>;
	value?: unknown;
	muted?: boolean;
	currentTime?: number;
	currentTimeSetCount?: number;
	play?: ReturnType<typeof vi.fn>;
	pause?: ReturnType<typeof vi.fn>;
	setPointerCapture?: ReturnType<typeof vi.fn>;
	releasePointerCapture?: ReturnType<typeof vi.fn>;
	addEventListener: (
		type: string,
		listener: (event: TestEvent) => void,
	) => void;
	removeEventListener: (
		type: string,
		listener: (event: TestEvent) => void,
	) => void;
	dispatchEvent: (event: TestEvent) => void;
	getRootNode: () => TestElementNode;
	getBoundingClientRect?: () => {
		left: number;
		width: number;
	};
};

type TestNode = TestTextNode | TestElementNode;

const renderer = createRenderer<TestNode, TestElementNode>({
	patchProp(element, key, _previousValue, nextValue) {
		if (nextValue === null || nextValue === undefined) {
			delete element.props[key];
			if (key === "value") {
				element.value = undefined;
			}
			return;
		}

		element.props[key] = nextValue;
		if (key === "value") {
			element.value = nextValue;
		}
	},
	insert(child, parent, anchor) {
		child.parent = parent;
		const anchorIndex = anchor ? parent.children.indexOf(anchor) : -1;
		if (anchorIndex >= 0) {
			parent.children.splice(anchorIndex, 0, child);
			return;
		}
		parent.children.push(child);
	},
	remove(child) {
		if (!child.parent) {
			return;
		}
		const index = child.parent.children.indexOf(child);
		if (index >= 0) {
			child.parent.children.splice(index, 1);
		}
		child.parent = null;
	},
	createElement(type) {
		const element: TestElementNode = {
			type,
			props: {},
			children: [],
			text: "",
			parent: null,
			listeners: {},
			currentTimeSetCount: 0,
			play: vi.fn(() => Promise.resolve()),
			pause: vi.fn(),
			setPointerCapture: vi.fn(),
			releasePointerCapture: vi.fn(),
			addEventListener(eventType, listener) {
				(this.listeners[eventType] ??= []).push(listener);
			},
			removeEventListener(eventType, listener) {
				this.listeners[eventType] = (this.listeners[eventType] ?? []).filter(
					(candidate) => candidate !== listener,
				);
			},
			dispatchEvent(event) {
				for (const listener of this.listeners[event.type] ?? []) {
					listener({ ...event, target: event.target ?? this });
				}
			},
			getRootNode() {
				let current: TestElementNode = this;
				while (current.parent) {
					current = current.parent;
				}
				return current;
			},
		};

		let storedCurrentTime = 0;
		let lastMediaUpdateMs = Date.now();
		let isMediaPlaying = false;

		Object.defineProperty(element, "currentTime", {
			configurable: true,
			enumerable: true,
			get() {
				if (!isMediaPlaying) {
					return storedCurrentTime;
				}

				return storedCurrentTime + (Date.now() - lastMediaUpdateMs) / 1000;
			},
			set(nextValue: number) {
				storedCurrentTime = nextValue;
				lastMediaUpdateMs = Date.now();
				element.currentTimeSetCount = (element.currentTimeSetCount ?? 0) + 1;
			},
		});

		element.play = vi.fn(() => {
			storedCurrentTime = element.currentTime ?? storedCurrentTime;
			lastMediaUpdateMs = Date.now();
			isMediaPlaying = true;
			return Promise.resolve();
		});
		element.pause = vi.fn(() => {
			storedCurrentTime = element.currentTime ?? storedCurrentTime;
			lastMediaUpdateMs = Date.now();
			isMediaPlaying = false;
		});

		Object.defineProperty(element, "clientWidth", {
			configurable: true,
			enumerable: true,
			get() {
				return elementClientWidthState.value;
			},
		});
		element.getBoundingClientRect = () => ({
			left: 0,
			width: elementBoundingWidthState.value,
		});

		return element;
	},
	createText(text) {
		return { type: "text", text, parent: null };
	},
	createComment(text) {
		return { type: "comment", text, parent: null };
	},
	setText(node, text) {
		node.text = text;
	},
	setElementText(element, text) {
		element.text = text;
		element.children = [];
	},
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
	insertStaticContent(content, parent, anchor) {
		const node: TestTextNode = { type: "static", text: content, parent };
		const anchorIndex = anchor ? parent.children.indexOf(anchor) : -1;
		if (anchorIndex >= 0) {
			parent.children.splice(anchorIndex, 0, node);
		} else {
			parent.children.push(node);
		}
		return [node, node];
	},
});

function createRootNode(): TestElementNode {
	return {
		type: "root",
		props: {},
		children: [],
		text: "",
		parent: null,
		listeners: {},
		setPointerCapture: vi.fn(),
		releasePointerCapture: vi.fn(),
		addEventListener() {},
		removeEventListener() {},
		dispatchEvent() {},
		getRootNode() {
			return this;
		},
	};
}

function renderView() {
	const pinia = createPinia();
	setActivePinia(pinia);
	const root = createRootNode();
	const app = renderer.createApp(SongTrackEditorView);
	app.use(pinia);
	app.use(i18n);
	app.mount(root);
	return {
		root,
		unmount: () => app.unmount(),
	};
}

function isElementNode(node: TestNode): node is TestElementNode {
	return (
		node.type !== "text" && node.type !== "comment" && node.type !== "static"
	);
}

function textContent(node: TestNode): string {
	if (!isElementNode(node)) {
		return node.type === "comment" ? "" : node.text;
	}
	return `${node.text}${node.children.map(textContent).join("")}`;
}

function findElement(
	node: TestNode,
	predicate: (candidate: TestElementNode) => boolean,
): TestElementNode | null {
	if (isElementNode(node) && predicate(node)) {
		return node;
	}
	if (!isElementNode(node)) {
		return null;
	}
	for (const child of node.children) {
		const match = findElement(child, predicate);
		if (match) {
			return match;
		}
	}
	return null;
}

function findByText(
	root: TestElementNode,
	value: string,
): TestElementNode | null {
	return findElement(root, (node) => textContent(node).includes(value));
}

function findButtonByText(
	root: TestElementNode,
	value: string,
): TestElementNode {
	const button = findElement(
		root,
		(node) => node.type === "button" && textContent(node).includes(value),
	);
	if (!button) {
		throw new Error(`Button with text '${value}' was not found.`);
	}
	return button;
}

function findByTestId(root: TestElementNode, testId: string): TestElementNode {
	const element = findElement(
		root,
		(node) => node.props["data-testid"] === testId,
	);
	if (!element) {
		throw new Error(`Element with test id '${testId}' was not found.`);
	}
	return element;
}

function queryByTestId(
	root: TestElementNode,
	testId: string,
): TestElementNode | null {
	return findElement(root, (node) => node.props["data-testid"] === testId);
}

function setInputValue(input: TestElementNode, value: string) {
	input.value = value;
	const onInput = input.props.onInput;
	if (typeof onInput === "function") {
		onInput({ target: input });
		return;
	}
	input.dispatchEvent({ type: "input", target: input });
}

function clickButton(button: TestElementNode) {
	const onClick = button.props.onClick;
	if (typeof onClick !== "function") {
		throw new Error("Click handler was not found.");
	}
	void onClick({ preventDefault() {} });
}

function clickElement(
	element: TestElementNode,
	event: Record<string, unknown> = {},
) {
	const onClick = element.props.onClick;
	if (typeof onClick !== "function") {
		throw new Error("Click handler was not found.");
	}
	void onClick({ preventDefault() {}, currentTarget: element, ...event });
}

function dragTrackClip(
	root: TestElementNode,
	trackId: string,
	startClientX: number,
	endClientX: number,
) {
	const clip = findByTestId(root, `track-clip-${trackId}`);
	const pointerDown = clip.props.onPointerdown;
	const pointerMove = clip.props.onPointermove;
	const pointerUp = clip.props.onPointerup;
	if (
		typeof pointerDown !== "function" ||
		typeof pointerMove !== "function" ||
		typeof pointerUp !== "function"
	) {
		throw new Error("Pointer handlers were not found.");
	}

	pointerDown({
		clientX: startClientX,
		pointerId: 1,
		currentTarget: clip,
		preventDefault() {},
	});
	pointerMove({
		clientX: endClientX,
		pointerId: 1,
		currentTarget: clip,
		preventDefault() {},
	});
	pointerUp({
		clientX: endClientX,
		pointerId: 1,
		currentTarget: clip,
		preventDefault() {},
	});
}

function findElements(
	node: TestNode,
	predicate: (candidate: TestElementNode) => boolean,
): TestElementNode[] {
	if (!isElementNode(node)) {
		return [];
	}

	const matches = predicate(node) ? [node] : [];
	for (const child of node.children) {
		matches.push(...findElements(child, predicate));
	}
	return matches;
}

function getTrackNamesInRenderedOrder(root: TestElementNode): string[] {
	return findElements(root, (node) => {
		const classes = String(node.props.class || "");
		return (
			node.type === "button" &&
			classes.includes("btn") &&
			classes.includes("btn-sm") &&
			classes.includes("text-start") &&
			classes.includes("px-0") &&
			classes.includes("border-0")
		);
	}).map((node) => textContent(node).trim());
}

function isDescendantOf(
	node: TestElementNode,
	ancestor: TestElementNode,
): boolean {
	let current: TestElementNode | null = node;
	while (current) {
		if (current === ancestor) {
			return true;
		}
		current = current.parent;
	}
	return false;
}

async function flushView() {
	for (let index = 0; index < 8; index += 1) {
		await Promise.resolve();
		await nextTick();
	}
}

describe("SongTrackEditorView", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		routeState.params.songId = "song-123";
		routeState.query.title = "Paint It Black";
		routerPushMock.mockReset();
		repositoryGetInstrumentsBySongIdMock.mockReset();
		repositoryGetInstrumentByIdMock.mockReset();
		repositoryUpdateInstrumentVideoStartTimeMock.mockReset();
		bootstrapTooltipCtor.mockReset();
		bootstrapTooltipDisposeMock.mockReset();
		localStorageState.clear();
		elementClientWidthState.value = 720;
		elementBoundingWidthState.value = 720;
		vi.unstubAllGlobals();
		vi.stubGlobal("localStorage", {
			getItem: vi.fn((key: string) => localStorageState.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => {
				localStorageState.set(key, value);
			}),
			removeItem: vi.fn((key: string) => {
				localStorageState.delete(key);
			}),
		});
	});

	it("shows only tracks with available videos and derives the global duration from their offsets", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Batería",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 5000,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Batería",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 1000,
				video: null,
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		expect(findByText(view.root, "Guitarra principal")).not.toBeNull();
		expect(findByText(view.root, "Batería")).toBeNull();
		expect(queryByTestId(view.root, "selected-video-placeholder")).toBeNull();
		expect(findByTestId(view.root, "selected-video").type).toBe("video");
		const selectedVideo = findByTestId(view.root, "selected-video");
		expect(selectedVideo.props).toEqual(
			expect.objectContaining({
				src: "https://cdn.example/guitar.mp4",
				muted: "",
				preload: "metadata",
			}),
		);
		expect(selectedVideo.props.controls).toBeUndefined();
		expect(textContent(findByTestId(view.root, "timeline-duration"))).toContain(
			"00:17",
		);

		view.unmount();
	});

	it("prepends the original YouTube audio as a synced reference track when the route provides the clip URL and duration", async () => {
		class FakeYtPlayer {
			currentTimeSec = 0;
			mutedState = false;
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
				queueMicrotask(() => this.onReady?.({ target: this }));
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

			playVideo(): void {}

			pauseVideo(): void {}

			destroy(): void {}
		}

		vi.stubGlobal("YT", { Player: FakeYtPlayer });

		routeState.query = {
			title: "Paint It Black",
			originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			originalVideoClipDurationSeconds: "187",
		};

		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 5000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		try {
			await flushView();
			await flushView();

			expect(
				textContent(findByTestId(view.root, "original-audio-header-title")),
			).toBe("Video original (YouTube)");
			expect(
				queryByTestId(view.root, "sync-audio-__original-audio__"),
			).not.toBeNull();
			expect(
				queryByTestId(view.root, "track-solo-toggle-__original-audio__"),
			).not.toBeNull();
			expect(
				queryByTestId(view.root, "track-mute-toggle-__original-audio__"),
			).not.toBeNull();

			// The reference track has no dedicated row/lane in the track list anymore.
			expect(getTrackNamesInRenderedOrder(view.root)).toEqual([
				"Guitarra principal",
			]);
			expect(
				queryByTestId(view.root, "track-clip-__original-audio__"),
			).toBeNull();
			expect(
				queryByTestId(view.root, "track-meta-__original-audio__"),
			).toBeNull();

			// The video preview defaults to the first real instrument track, not the reference audio.
			expect(findByTestId(view.root, "selected-video").props.src).toBe(
				"https://cdn.example/guitar.mp4",
			);

			clickButton(findByTestId(view.root, "track-mute-toggle-__original-audio__"));
			await flushView();
			expect(
				findByTestId(view.root, "track-mute-toggle-__original-audio__").props[
					"aria-pressed"
				],
			).toBe(true);
		} finally {
			routeState.query = {
				title: "Paint It Black",
				originalVideoClipDurationSeconds: undefined,
			};
			view.unmount();
		}
	});

	it("renders an Audacity-like two-column lane layout with a centered passive preview area and shows a vertical global playhead in the track area", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 6000,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		const layout = findByTestId(view.root, "track-editor-layout");
		const trackList = findByTestId(view.root, "track-list");
		const previewMonitor = findByTestId(view.root, "selected-video");
		const headerLeft = findByTestId(view.root, "track-header-left");
		const headerRight = findByTestId(view.root, "track-header-right");
		const transportTimeRow = findByTestId(view.root, "transport-time-row");
		const firstTrackMeta = findByTestId(view.root, "track-meta-instrument-1");
		const firstTrackLane = findByTestId(view.root, "track-lane-instrument-1");
		const firstTrackTitleButton = findButtonByText(
			view.root,
			"Guitarra principal",
		);
		const firstTrackTitle = findByTestId(view.root, "track-title-instrument-1");
		const firstTrackStartTimeLabel = findByText(
			firstTrackMeta,
			"Empieza en",
		);
		const firstTrackStartTimeInput = findByTestId(
			view.root,
			"track-start-time-input-instrument-1",
		);

		expect(layout.props.style).toEqual(
			expect.objectContaining({
				gridTemplateColumns: "minmax(12.5rem, 12.5rem) minmax(0, 1fr)",
			}),
		);
		expect(findButtonByText(view.root, "Reproducir").props.title).toBe("Play");
		expect(findButtonByText(view.root, "Ir al inicio").props.title).toBe(
			"Empezar desde el principio",
		);
		expect(
			findButtonByText(view.root, "Retroceder 1 segundo").props.title,
		).toBe("Rebobinar 1 segundo");
		expect(findButtonByText(view.root, "Avanzar 1 segundo").props.title).toBe(
			"Avanzar 1 segundo",
		);
		expect(queryByTestId(view.root, "timeline-seek")).toBeNull();
		expect(textContent(transportTimeRow)).toContain("00:00 / 00:15");
		expect(isDescendantOf(previewMonitor, headerRight)).toBe(false);
		expect(previewMonitor.props).toEqual(
			expect.objectContaining({
				src: "https://cdn.example/guitar.mp4",
				muted: "",
				preload: "metadata",
			}),
		);
		expect(String(previewMonitor.props.class || "")).toContain(
			"object-fit-contain",
		);
		expect(String(previewMonitor.props.class || "")).not.toContain(
			"object-fit-cover",
		);
		expect(previewMonitor.props.controls).toBeUndefined();
		expect(String(headerLeft.props.class || "")).not.toContain("rounded");
		expect(String(headerRight.props.class || "")).not.toContain("rounded");
		expect(isDescendantOf(firstTrackMeta, trackList)).toBe(true);
		expect(isDescendantOf(firstTrackLane, trackList)).toBe(true);
		expect(trackList.props.style).toEqual(
			expect.objectContaining({
				gridTemplateColumns: "minmax(12.5rem, 12.5rem) minmax(0, 1fr)",
				width: "100%",
				minWidth: "0",
				gridColumn: "1 / -1",
			}),
		);
		expect(firstTrackMeta.props.class).not.toContain("rounded-4");
		expect(firstTrackMeta.props.style).toEqual(
			expect.objectContaining({
				maxWidth: "200px",
				minHeight: "100%",
				gap: "5px",
			}),
		);
		expect(String(firstTrackTitleButton.props.class || "")).toContain("py-0");
		expect(firstTrackTitleButton.props.style).toEqual(
			expect.objectContaining({
				minHeight: "unset",
			}),
		);
		expect(firstTrackTitle.props.style).toEqual(
			expect.objectContaining({
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
			}),
		);
		expect(firstTrackStartTimeLabel).not.toBeNull();
		expect(String(firstTrackStartTimeInput.props.class || "")).toContain(
			"form-control",
		);
		expect(firstTrackStartTimeInput.props.style).toEqual(
			expect.objectContaining({
				minHeight: "unset",
				padding: "4px 10px",
				borderRadius: "0",
			}),
		);
		expect(textContent(firstTrackMeta)).toContain("Duración: 00:12");
		expect(textContent(firstTrackMeta)).not.toContain("Inicio");
		expect(textContent(firstTrackLane)).toContain("Inicio: 00:00");
		expect(textContent(firstTrackLane)).not.toContain("Duración total");
		expect(firstTrackLane.props.class).toContain("bg-dark-subtle");
		expect(firstTrackLane.props.class).not.toContain("rounded-4");
		expect(
			textContent(findByTestId(view.root, "track-clip-instrument-1")),
		).toContain("Inicio: 00:00");
		expect(firstTrackLane.props.class).toContain("align-items-stretch");
		expect(firstTrackLane.props.style).toEqual(
			expect.objectContaining({
				padding: "0",
				width: "100%",
				minHeight: "4rem",
			}),
		);

		clickButton(findButtonByText(view.root, "Zoom timeline"));
		await flushView();
		setInputValue(findByTestId(view.root, "timeline-zoom-input"), "200");
		await flushView();

		for (let index = 0; index < 9; index += 1) {
			clickButton(findButtonByText(view.root, "Avanzar 1 segundo"));
		}
		await flushView();

		expect(findByTestId(view.root, "global-playhead").props.style).toEqual(
			expect.objectContaining({
				left: "432px",
				height: "100%",
				width: "3px",
				background:
					"linear-gradient(180deg, rgba(255,255,255,0.95) 0%, var(--rock-accent-tertiary) 20%, var(--rock-accent-tertiary) 100%)",
				boxShadow:
					"0 0 0 1px rgba(255,255,255,0.35), 0 0 10px rgba(var(--rock-accent-tertiary-rgb), 0.35)",
			}),
		);

		view.unmount();
	});

	it("keeps only the compact count and zoom summary while using a subtle red active-track emphasis across panels", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 6000,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		const summary = findByTestId(view.root, "editor-summary");
		expect(textContent(summary)).toContain("2 pistas");
		expect(textContent(summary)).toContain("Zoom 100%");
		expect(textContent(summary)).not.toContain("Activa:");
		expect(
			queryByTestId(view.root, "track-active-badge-instrument-1"),
		).toBeNull();
		expect(
			queryByTestId(view.root, "track-active-badge-instrument-2"),
		).toBeNull();
		expect(
			String(
				findByTestId(view.root, "track-meta-instrument-1").props.class || "",
			),
		).toContain("border-primary-subtle");
		expect(
			String(
				findByTestId(view.root, "track-meta-instrument-1").props.class || "",
			),
		).toContain("bg-primary-subtle");
		expect(
			String(
				findByTestId(view.root, "track-meta-instrument-1").props.class || "",
			),
		).not.toContain("rounded");
		expect(
			String(
				findByTestId(view.root, "track-clip-instrument-1").props.class || "",
			),
		).toContain("bg-primary-subtle");
		expect(
			String(
				findByTestId(view.root, "track-clip-instrument-1").props.class || "",
			),
		).toContain("text-primary-emphasis");

		clickButton(findButtonByText(view.root, "Bajo"));
		await flushView();

		expect(
			textContent(findByTestId(view.root, "editor-summary")),
		).not.toContain("Activa:");
		expect(
			String(
				findByTestId(view.root, "track-meta-instrument-2").props.class || "",
			),
		).toContain("border-primary-subtle");
		expect(
			String(
				findByTestId(view.root, "track-meta-instrument-2").props.class || "",
			),
		).toContain("bg-primary-subtle");
		expect(
			String(
				findByTestId(view.root, "track-meta-instrument-2").props.class || "",
			),
		).not.toContain("rounded");
		expect(
			String(
				findByTestId(view.root, "track-clip-instrument-2").props.class || "",
			),
		).toContain("bg-primary-subtle");
		expect(
			String(
				findByTestId(view.root, "track-clip-instrument-2").props.class || "",
			),
		).toContain("text-primary-emphasis");

		view.unmount();
	});

	it("shows timeline marks above the tracks and lets the user zoom horizontally", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 5000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		expect(textContent(findByTestId(view.root, "timeline-marker-0"))).toContain(
			"00:00",
		);
		expect(textContent(findByTestId(view.root, "timeline-marker-5"))).toContain(
			"00:05",
		);
		expect(
			findByTestId(view.root, "timeline-scroll-content").props.style,
		).toEqual(
			expect.objectContaining({
				width: "720px",
			}),
		);

		const firstMarker = findByTestId(view.root, "timeline-marker-0").parent;
		const middleMarker = findByTestId(view.root, "timeline-marker-15").parent;
		const lastMarker = findByTestId(view.root, "timeline-marker-30").parent;

		if (!firstMarker || !middleMarker || !lastMarker) {
			throw new Error("Timeline marker containers were not rendered.");
		}

		expect(firstMarker.props.style).toEqual(
			expect.objectContaining({
				left: "0px",
			}),
		);
		expect(firstMarker.props.style).not.toEqual(
			expect.objectContaining({
				transform: "translateX(-50%)",
			}),
		);
		expect(middleMarker.props.style).toEqual(
			expect.objectContaining({
				left: "360px",
				transform: "translateX(-50%)",
			}),
		);
		expect(lastMarker.props.style).toEqual(
			expect.objectContaining({
				left: "720px",
			}),
		);
		expect(lastMarker.props.style).not.toEqual(
			expect.objectContaining({
				transform: "translateX(-50%)",
			}),
		);

		clickButton(findButtonByText(view.root, "Zoom timeline"));
		await flushView();
		setInputValue(findByTestId(view.root, "timeline-zoom-input"), "200");
		await flushView();

		expect(
			findByTestId(view.root, "timeline-scroll-content").props.style,
		).toEqual(
			expect.objectContaining({
				width: "1440px",
			}),
		);
		expect(
			findByTestId(view.root, "track-clip-instrument-1").props.class,
		).not.toContain("rounded-3");
		expect(
			findByTestId(view.root, "track-clip-instrument-1").props.style,
		).toEqual(
			expect.objectContaining({
				left: "240px",
				height: "3.75rem",
				justifyContent: "flex-start",
				transform: "translateY(-50%)",
			}),
		);

		view.unmount();
	});

	it("uses coarser timeline markers for long songs so the ruler stays readable", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 0,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 300,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		expect(textContent(findByTestId(view.root, "timeline-marker-0"))).toContain(
			"00:00",
		);
		expect(
			textContent(findByTestId(view.root, "timeline-marker-30")),
		).toContain("00:30");
		expect(queryByTestId(view.root, "timeline-marker-5")).toBeNull();
		expect(queryByTestId(view.root, "timeline-marker-25")).toBeNull();

		view.unmount();
	});

	it("uses finer timeline markers again when zoom makes a long song readable", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 0,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 300,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		clickButton(findButtonByText(view.root, "Zoom timeline"));
		await flushView();
		setInputValue(findByTestId(view.root, "timeline-zoom-input"), "200");
		await flushView();

		expect(
			textContent(findByTestId(view.root, "timeline-marker-15")),
		).toContain("00:15");
		expect(
			textContent(findByTestId(view.root, "timeline-marker-30")),
		).toContain("00:30");
		expect(queryByTestId(view.root, "timeline-marker-5")).toBeNull();

		view.unmount();
	});

	it("restores the saved zoom for the current song instead of applying fit on entry", async () => {
		localStorageState.set(
			"song-track-editor-zoom",
			JSON.stringify({
				"song-123": 175,
			}),
		);
		elementClientWidthState.value = 960;
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 5000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		expect(textContent(findByTestId(view.root, "editor-summary"))).toContain(
			"Zoom 175%",
		);
		expect(
			findByTestId(view.root, "timeline-scroll-content").props.style,
		).toEqual(
			expect.objectContaining({
				width: "1260px",
			}),
		);

		view.unmount();
	});

	it("applies fit on entry using the wrapper inner width when the current song has no saved zoom, even if bounding width is larger", async () => {
		elementClientWidthState.value = 960;
		elementBoundingWidthState.value = 1000;
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 5000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		expect(textContent(findByTestId(view.root, "editor-summary"))).toContain(
			"Zoom 133%",
		);
		expect(
			findByTestId(view.root, "timeline-scroll-content").props.style,
		).toEqual(
			expect.objectContaining({
				width: "957.6px",
			}),
		);
		expect(localStorage.setItem).not.toHaveBeenCalled();

		clickButton(findButtonByText(view.root, "Zoom timeline"));
		await flushView();
		setInputValue(findByTestId(view.root, "timeline-zoom-input"), "200");
		await flushView();

		expect(localStorage.setItem).toHaveBeenCalledWith(
			"song-track-editor-zoom",
			JSON.stringify({
				"song-123": 200,
			}),
		);

		view.unmount();
	});

	it("clips ruler edge decorations in fit mode so internal absolute children do not widen the horizontal scroll range", async () => {
		elementClientWidthState.value = 960;
		elementBoundingWidthState.value = 1000;
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 5000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		expect(
			String(
				findByTestId(view.root, "timeline-scroll-content").props.class || "",
			),
		).toContain("overflow-hidden");
		expect(
			String(
				findByTestId(view.root, "timeline-ruler-surface").props.class || "",
			),
		).toContain("overflow-hidden");
		expect(
			findByTestId(view.root, "timeline-scroll-content").props.style,
		).toEqual(
			expect.objectContaining({
				width: "957.6px",
				minWidth: "957.6px",
			}),
		);

		view.unmount();
	});

	it("uses a two-row transport header with a floating zoom popup and timeline-only seeking surface", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 5000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		expect(queryByTestId(view.root, "timeline-seek")).toBeNull();
		expect(
			findByTestId(view.root, "track-editor-layout").props.class,
		).toContain("align-items-stretch");
		expect(
			findByTestId(view.root, "track-editor-layout").props.class,
		).not.toContain("align-items-start");
		expect(
			textContent(findByTestId(view.root, "transport-time-row")),
		).toContain("00:00 / 00:17");
		clickButton(findButtonByText(view.root, "Zoom timeline"));
		await flushView();
		expect(findByTestId(view.root, "zoom-popover").props.style).toEqual(
			expect.objectContaining({
				position: "absolute",
				top: "calc(100% + 0.5rem)",
				right: "0",
			}),
		);
		clickElement(findByTestId(view.root, "zoom-popover-backdrop"));
		await flushView();
		expect(queryByTestId(view.root, "zoom-popover")).toBeNull();
		clickButton(findButtonByText(view.root, "Avanzar 1 segundo"));
		await flushView();
		expect(
			textContent(findByTestId(view.root, "transport-time-row")),
		).toContain("00:01 / 00:17");
		expect(
			findByTestId(view.root, "timeline-scroll-wrapper").props.class,
		).toContain("overflow-y-hidden");
		expect(
			findByTestId(view.root, "timeline-scroll-wrapper").props.class,
		).toContain("h-100");
		expect(
			findByTestId(view.root, "timeline-ruler-surface").props.class,
		).toContain("h-100");
		expect(
			findByTestId(view.root, "timeline-ruler-surface").props.style,
		).toEqual(
			expect.objectContaining({
				minHeight: "4rem",
			}),
		);
		expect(
			findByTestId(view.root, "track-lane-instrument-1").props.class,
		).toContain("align-items-stretch");
		expect(
			findByTestId(view.root, "track-lane-scroll-wrapper-instrument-1").props
				.class,
		).toContain("overflow-y-hidden");
		expect(
			findByTestId(view.root, "track-lane-scroll-wrapper-instrument-1").props
				.class,
		).toContain("h-100");
		expect(findButtonByText(view.root, "Zoom timeline").props.title).toBe(
			"Zoom",
		);

		const timelineScroll = findByTestId(view.root, "timeline-scroll-content");
		const timelineMarker = findByTestId(view.root, "timeline-marker-10");

		clickElement(timelineScroll, {
			clientX: 205,
			currentTarget: {
				...timelineScroll,
				getBoundingClientRect: () => ({ left: 25, width: 720, height: 64 }),
			},
		});
		await flushView();
		expect(
			textContent(findByTestId(view.root, "transport-time-row")),
		).toContain("00:07 / 00:17");

		clickElement(timelineScroll, {
			offsetX: 12,
			clientX: 275,
			target: timelineMarker,
			currentTarget: {
				...timelineScroll,
				getBoundingClientRect: () => ({ left: 25, width: 720, height: 64 }),
			},
		});
		await flushView();
		expect(
			textContent(findByTestId(view.root, "transport-time-row")),
		).toContain("00:10 / 00:17");

		view.unmount();
	});

	it("positions the vertical playhead with the shared track timeline when offsets extend beyond the minimum window", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 32000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 40,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		for (let index = 0; index < 36; index += 1) {
			clickButton(findButtonByText(view.root, "Avanzar 1 segundo"));
		}
		await flushView();

		expect(findByTestId(view.root, "global-playhead").props.style).toEqual(
			expect.objectContaining({
				left: "360px",
			}),
		);

		view.unmount();
	});

	it("renders a synchronized playhead line inside each track lane using the same global timeline offset", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 6000,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		clickButton(findButtonByText(view.root, "Zoom timeline"));
		await flushView();
		setInputValue(findByTestId(view.root, "timeline-zoom-input"), "200");
		await flushView();

		for (let index = 0; index < 9; index += 1) {
			clickButton(findButtonByText(view.root, "Avanzar 1 segundo"));
		}
		await flushView();

		const globalPlayheadStyle = findByTestId(view.root, "global-playhead").props
			.style;

		expect(globalPlayheadStyle).toEqual(
			expect.objectContaining({
				left: "432px",
			}),
		);
		expect(globalPlayheadStyle).toEqual(
			expect.objectContaining({
				height: "100%",
				width: "3px",
				background:
					"linear-gradient(180deg, rgba(255,255,255,0.95) 0%, var(--rock-accent-tertiary) 20%, var(--rock-accent-tertiary) 100%)",
			}),
		);
		expect(
			findByTestId(view.root, "track-playhead-instrument-1").props.style,
		).toEqual(expect.objectContaining(globalPlayheadStyle));
		expect(
			findByTestId(view.root, "track-playhead-instrument-2").props.style,
		).toEqual(expect.objectContaining(globalPlayheadStyle));

		view.unmount();
	});

	it("renders the autosave status as a bottom-right overlay so it never participates in the duration row layout", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 1000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});
		const pendingSave: { resolve?: () => void } = {};
		repositoryUpdateInstrumentVideoStartTimeMock.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					pendingSave.resolve = resolve;
				}),
		);

		const view = renderView();
		await flushView();
		await flushView();

		const metaPanel = findByTestId(view.root, "track-meta-instrument-1");
		const durationRow = findByTestId(
			view.root,
			"track-duration-row-instrument-1",
		);

		expect(String(metaPanel.props.class || "")).toContain("position-relative");
		expect(durationRow.props.style).toEqual(
			expect.objectContaining({
				paddingRight: "2rem",
			}),
		);
		expect(textContent(durationRow)).toContain("Duración: 00:12");
		expect(durationRow.props.style).toEqual(
			expect.objectContaining({
				marginTop: "0",
				marginBottom: "0",
			}),
		);
		expect(
			queryByTestId(view.root, "track-autosave-overlay-instrument-1"),
		).toBeNull();

		dragTrackClip(view.root, "instrument-1", 100, 160);
		await flushView();

		const pendingOverlay = findByTestId(
			view.root,
			"track-autosave-overlay-instrument-1",
		);
		expect(pendingOverlay.props.style).toEqual(
			expect.objectContaining({
				position: "absolute",
				right: "1rem",
				bottom: "1rem",
			}),
		);
		const pendingSpinner = findByTestId(
			view.root,
			"autosave-saving-icon-instrument-1",
		);
		expect(String(pendingSpinner.props.class || "")).toContain(
			"text-secondary",
		);
		expect(pendingSpinner.props.style).toEqual(
			expect.objectContaining({
				opacity: 0.35,
			}),
		);
		expect(textContent(pendingSpinner)).toBe("");

		await vi.advanceTimersByTimeAsync(2500);
		await flushView();

		const savingOverlay = findByTestId(
			view.root,
			"track-autosave-overlay-instrument-1",
		);
		expect(savingOverlay.props.style).toEqual(
			expect.objectContaining({
				position: "absolute",
				right: "1rem",
				bottom: "1rem",
			}),
		);
		const savingSpinner = findByTestId(
			view.root,
			"autosave-saving-icon-instrument-1",
		);
		expect(String(savingSpinner.props.class || "")).toContain("text-primary");
		expect(savingSpinner.props.style).toEqual(
			expect.objectContaining({
				opacity: 1,
			}),
		);
		expect(textContent(savingSpinner)).toBe("");

		if (!pendingSave.resolve) {
			throw new Error("The pending save promise was not captured.");
		}
		pendingSave.resolve();
		await flushView();

		expect(
			queryByTestId(view.root, "autosave-saved-icon-instrument-1"),
		).not.toBeNull();

		view.unmount();
		vi.useRealTimers();
	});

	it("drags a clip horizontally using the same zoomed timeline geometry and keeps the manual startTimeMs input visible", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 1000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});
		repositoryUpdateInstrumentVideoStartTimeMock.mockResolvedValue(undefined);

		const view = renderView();
		await flushView();
		await flushView();

		clickButton(findButtonByText(view.root, "Zoom timeline"));
		await flushView();
		setInputValue(findByTestId(view.root, "timeline-zoom-input"), "200");
		await flushView();

		expect(
			findByTestId(view.root, "track-start-time-input-instrument-1").props,
		).toEqual(
			expect.objectContaining({
				type: "text",
				inputmode: "numeric",
			}),
		);

		dragTrackClip(view.root, "instrument-1", 100, 160);
		await flushView();

		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 2250,
			}),
		);

		view.unmount();
		vi.useRealTimers();
	});

	it("clamps loaded and manually edited startTimeMs to the original video clip duration from the route query when available", async () => {
		vi.useFakeTimers();
		routeState.query = {
			title: "Paint It Black",
			originalVideoClipDurationSeconds: "2",
		};
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 4000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});
		repositoryUpdateInstrumentVideoStartTimeMock.mockResolvedValue(undefined);

		const view = renderView();
		await flushView();
		await flushView();

		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 2000,
			}),
		);
		expect(
			findByTestId(view.root, "track-start-time-input-instrument-1").value,
		).toBe("2000");
		expect(textContent(findByTestId(view.root, "editor-summary"))).toContain(
			"Video original 00:02",
		);

		setInputValue(
			findByTestId(view.root, "track-start-time-input-instrument-1"),
			"1500",
		);
		await flushView();
		setInputValue(
			findByTestId(view.root, "track-start-time-input-instrument-1"),
			"2500",
		);
		await flushView();

		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 2000,
			}),
		);

		await vi.advanceTimersByTimeAsync(2500);
		await flushView();

		expect(repositoryUpdateInstrumentVideoStartTimeMock).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-1"),
			{
				startTimeMs: 2000,
			},
		);

		view.unmount();
		vi.useRealTimers();
	});

	it("keeps positive startTimeMs uncapped when the original video clip duration is missing", async () => {
		vi.useFakeTimers();
		routeState.query = {
			title: "Paint It Black",
			originalVideoClipDurationSeconds: undefined,
		};
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 4000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});
		repositoryUpdateInstrumentVideoStartTimeMock.mockResolvedValue(undefined);

		const view = renderView();
		await flushView();
		await flushView();

		expect(
			textContent(findByTestId(view.root, "editor-summary")),
		).not.toContain("Video original");

		setInputValue(
			findByTestId(view.root, "track-start-time-input-instrument-1"),
			"25000",
		);
		await flushView();

		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 25000,
			}),
		);

		await vi.advanceTimersByTimeAsync(2500);
		await flushView();

		expect(repositoryUpdateInstrumentVideoStartTimeMock).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-1"),
			{
				startTimeMs: 25000,
			},
		);

		view.unmount();
		vi.useRealTimers();
	});

	it("drags a clip horizontally, keeps the manual startTimeMs input visible, and persists startTimeMs through the dedicated video endpoint", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 1000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});
		const pendingSave: { resolve?: () => void } = {};
		repositoryUpdateInstrumentVideoStartTimeMock.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					pendingSave.resolve = resolve;
				}),
		);

		const view = renderView();
		await flushView();
		await flushView();

		expect(
			findByTestId(view.root, "track-start-time-input-instrument-1").props,
		).toEqual(
			expect.objectContaining({
				type: "text",
				inputmode: "numeric",
			}),
		);

		dragTrackClip(view.root, "instrument-1", 100, 160);
		await flushView();
		await vi.advanceTimersByTimeAsync(2499);

		expect(repositoryUpdateInstrumentVideoStartTimeMock).not.toHaveBeenCalled();
		expect(
			queryByTestId(view.root, "autosave-saving-icon-instrument-1"),
		).not.toBeNull();
		expect(
			queryByTestId(view.root, "autosave-saved-icon-instrument-1"),
		).toBeNull();
		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 3500,
			}),
		);

		await vi.advanceTimersByTimeAsync(1);
		await flushView();

		expect(repositoryUpdateInstrumentVideoStartTimeMock).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-1"),
			{
				startTimeMs: 3500,
			},
		);
		const savingIcon = findByTestId(
			view.root,
			"autosave-saving-icon-instrument-1",
		);
		expect(String(savingIcon.props.class || "")).toContain("text-primary");
		expect(savingIcon.props.style).toEqual(
			expect.objectContaining({
				opacity: 1,
			}),
		);
		expect(textContent(savingIcon)).toBe("");

		if (!pendingSave.resolve) {
			throw new Error("The pending save promise was not captured.");
		}
		pendingSave.resolve();
		await flushView();

		const savedIcon = findByTestId(
			view.root,
			"autosave-saved-icon-instrument-1",
		);
		expect(String(savedIcon.props.class || "")).toContain(
			"bi bi-check-circle-fill",
		);
		expect(savedIcon.props.style).toEqual(
			expect.objectContaining({
				opacity: 1,
				transition: "opacity 3s linear",
			}),
		);

		await vi.advanceTimersByTimeAsync(1499);
		await flushView();

		expect(
			findByTestId(view.root, "autosave-saved-icon-instrument-1").props.style,
		).toEqual(
			expect.objectContaining({
				opacity: 1,
			}),
		);

		await vi.advanceTimersByTimeAsync(1);
		await flushView();

		expect(
			findByTestId(view.root, "autosave-saved-icon-instrument-1").props.style,
		).toEqual(
			expect.objectContaining({
				opacity: 0,
				transition: "opacity 3s linear",
			}),
		);

		await vi.advanceTimersByTimeAsync(3000);
		await flushView();

		expect(
			queryByTestId(view.root, "autosave-saved-icon-instrument-1"),
		).toBeNull();

		view.unmount();
		vi.useRealTimers();
	});

	it("navigates back to the songs anchor for the current song", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 1000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		clickButton(findButtonByText(view.root, "Volver"));

		expect(routerPushMock).toHaveBeenCalledWith({
			name: "SongsManager",
			hash: "#song-123",
		});

		view.unmount();
	});

	it("does not repeatedly reseek hidden audio players while they stay in sync, but reseeks on explicit transport jumps", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 0,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		const syncPlayer = findByTestId(view.root, "sync-audio-instrument-1");
		const initialSetCount = syncPlayer.currentTimeSetCount ?? 0;

		clickButton(findButtonByText(view.root, "Reproducir"));
		await flushView();

		const afterPlaySetCount = syncPlayer.currentTimeSetCount ?? 0;
		expect(afterPlaySetCount).toBeGreaterThan(initialSetCount);

		await vi.advanceTimersByTimeAsync(400);
		await flushView();
		const steadyStateSetCount = syncPlayer.currentTimeSetCount ?? 0;

		for (let index = 0; index < 8; index += 1) {
			await vi.advanceTimersByTimeAsync(200);
			await flushView();
			expect(syncPlayer.currentTimeSetCount).toBe(steadyStateSetCount);
		}

		clickButton(findButtonByText(view.root, "Avanzar 1 segundo"));
		await flushView();
		expect((syncPlayer.currentTimeSetCount ?? 0) - steadyStateSetCount).toBe(1);
		expect(syncPlayer.currentTime).toBeCloseTo(3, 3);

		view.unmount();
		vi.useRealTimers();
	});

	it("pauses future and finished tracks correctly while avoiding repeated zero-time reseeks before activation", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 2,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 2000,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 4,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		const firstTrackPlayer = findByTestId(view.root, "sync-audio-instrument-1");
		const futureTrackPlayer = findByTestId(
			view.root,
			"sync-audio-instrument-2",
		);
		const futureTrackInitialSetCount =
			futureTrackPlayer.currentTimeSetCount ?? 0;

		clickButton(findButtonByText(view.root, "Reproducir"));
		await flushView();

		expect(firstTrackPlayer.play).toHaveBeenCalled();
		expect(futureTrackPlayer.pause).toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(400);
		await flushView();
		const futureTrackSteadyStateSetCount =
			futureTrackPlayer.currentTimeSetCount ?? 0;
		expect(futureTrackSteadyStateSetCount).toBeGreaterThan(
			futureTrackInitialSetCount,
		);

		for (let index = 0; index < 3; index += 1) {
			await vi.advanceTimersByTimeAsync(200);
			await flushView();
			expect(futureTrackPlayer.currentTimeSetCount).toBe(
				futureTrackSteadyStateSetCount,
			);
		}

		for (let index = 0; index < 6; index += 1) {
			await vi.advanceTimersByTimeAsync(200);
			await flushView();
		}
		expect(futureTrackPlayer.play).toHaveBeenCalledTimes(1);
		expect(futureTrackPlayer.currentTime).toBeGreaterThanOrEqual(0);

		await vi.advanceTimersByTimeAsync(1200);
		await flushView();
		expect(firstTrackPlayer.pause).toHaveBeenCalled();

		const pauseCallsBeforeTransportPause =
			futureTrackPlayer.pause?.mock.calls.length ?? 0;
		clickButton(findButtonByText(view.root, "Pausar"));
		await flushView();
		expect(futureTrackPlayer.pause?.mock.calls.length ?? 0).toBeGreaterThan(
			pauseCallsBeforeTransportPause,
		);

		view.unmount();
		vi.useRealTimers();
	});

	it("mutes only the selected track audio player without affecting the other synchronized tracks", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		const firstTrackPlayer = findByTestId(view.root, "sync-audio-instrument-1");
		const secondTrackPlayer = findByTestId(
			view.root,
			"sync-audio-instrument-2",
		);

		expect(firstTrackPlayer.muted).toBe(false);
		expect(secondTrackPlayer.muted).toBe(false);
		expect(
			textContent(findByTestId(view.root, "track-meta-instrument-1")),
		).toContain("Silenciar");

		clickButton(findByTestId(view.root, "track-mute-toggle-instrument-1"));
		await flushView();

		expect(firstTrackPlayer.muted).toBe(true);
		expect(secondTrackPlayer.muted).toBe(false);

		clickButton(findButtonByText(view.root, "Reproducir"));
		await flushView();

		expect(firstTrackPlayer.play).toHaveBeenCalled();
		expect(secondTrackPlayer.play).toHaveBeenCalled();
		expect(firstTrackPlayer.currentTime).toBeCloseTo(0, 1);
		expect(secondTrackPlayer.currentTime).toBeCloseTo(0, 1);

		clickButton(findByTestId(view.root, "track-mute-toggle-instrument-1"));
		await flushView();

		expect(firstTrackPlayer.muted).toBe(false);
		expect(secondTrackPlayer.muted).toBe(false);

		view.unmount();
		vi.useRealTimers();
	});

	it("soloes one track by muting the other synchronized players without breaking playback sync", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		const firstTrackPlayer = findByTestId(view.root, "sync-audio-instrument-1");
		const secondTrackPlayer = findByTestId(
			view.root,
			"sync-audio-instrument-2",
		);

		expect(firstTrackPlayer.muted).toBe(false);
		expect(secondTrackPlayer.muted).toBe(false);

		clickButton(findByTestId(view.root, "track-solo-toggle-instrument-1"));
		await flushView();

		expect(firstTrackPlayer.muted).toBe(false);
		expect(secondTrackPlayer.muted).toBe(true);

		clickButton(findButtonByText(view.root, "Reproducir"));
		await flushView();

		expect(firstTrackPlayer.play).toHaveBeenCalled();
		expect(secondTrackPlayer.play).toHaveBeenCalled();
		expect(firstTrackPlayer.currentTime).toBeCloseTo(0, 1);
		expect(secondTrackPlayer.currentTime).toBeCloseTo(0, 1);

		view.unmount();
		vi.useRealTimers();
	});

	it("allows multiple solo tracks to remain audible together while muting non-solo tracks", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-3",
				name: "Batería",
				instrumentId: "catalog-3",
				songId: "song-123",
				musicianId: "musician-3",
				createdAt: "2026-07-15T10:02:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-3",
				name: "Batería",
				instrumentId: "catalog-3",
				songId: "song-123",
				musicianId: "musician-3",
				createdAt: "2026-07-15T10:02:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-3",
					songInstrumentId: "instrument-3",
					url: "https://cdn.example/drums.mp4",
					duration: 10,
					size: 777,
					createdAt: "2026-07-15T10:04:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		clickButton(findByTestId(view.root, "track-solo-toggle-instrument-1"));
		clickButton(findByTestId(view.root, "track-solo-toggle-instrument-2"));
		await flushView();

		expect(findByTestId(view.root, "sync-audio-instrument-1").muted).toBe(
			false,
		);
		expect(findByTestId(view.root, "sync-audio-instrument-2").muted).toBe(
			false,
		);
		expect(findByTestId(view.root, "sync-audio-instrument-3").muted).toBe(true);

		view.unmount();
	});

	it("keeps mute taking precedence when a soloed track is also muted", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		clickButton(findByTestId(view.root, "track-solo-toggle-instrument-1"));
		clickButton(findByTestId(view.root, "track-mute-toggle-instrument-1"));
		await flushView();

		expect(findByTestId(view.root, "sync-audio-instrument-1").muted).toBe(true);
		expect(findByTestId(view.root, "sync-audio-instrument-2").muted).toBe(true);

		view.unmount();
	});

	it("restores normal mute-only behavior after clearing the final solo track", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		clickButton(findByTestId(view.root, "track-mute-toggle-instrument-2"));
		clickButton(findByTestId(view.root, "track-solo-toggle-instrument-1"));
		await flushView();

		expect(findByTestId(view.root, "sync-audio-instrument-1").muted).toBe(
			false,
		);
		expect(findByTestId(view.root, "sync-audio-instrument-2").muted).toBe(true);

		clickButton(findByTestId(view.root, "track-solo-toggle-instrument-1"));
		await flushView();

		expect(findByTestId(view.root, "sync-audio-instrument-1").muted).toBe(
			false,
		);
		expect(findByTestId(view.root, "sync-audio-instrument-2").muted).toBe(true);

		view.unmount();
	});

	it("keeps the preview area passive without native controls while synchronizing the visible monitor and hidden audio track players", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 2000,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		clickButton(findButtonByText(view.root, "Reproducir"));
		await flushView();

		const previewMonitor = findByTestId(view.root, "selected-video");
		const syncPlayers = findElements(
			view.root,
			(node) =>
				node.type === "audio" &&
				String(node.props["data-testid"] || "").startsWith("sync-audio-"),
		);

		expect(previewMonitor.type).toBe("video");
		expect(previewMonitor.props).toEqual(
			expect.objectContaining({
				src: "https://cdn.example/guitar.mp4",
				muted: "",
				preload: "metadata",
			}),
		);
		expect(previewMonitor.props.controls).toBeUndefined();
		expect(syncPlayers).toHaveLength(2);
		expect(queryByTestId(view.root, "sync-video-instrument-1")).toBeNull();
		expect(queryByTestId(view.root, "sync-video-instrument-2")).toBeNull();
		expect(syncPlayers[0]?.play).toHaveBeenCalled();
		expect(syncPlayers[1]?.pause).toHaveBeenCalled();
		expect(syncPlayers[0]?.currentTime).toBeCloseTo(0, 2);
		expect(syncPlayers[1]?.currentTime).toBeCloseTo(0, 2);

		for (let index = 0; index < 3; index += 1) {
			clickButton(findButtonByText(view.root, "Avanzar 1 segundo"));
		}
		await flushView();

		expect(syncPlayers[0]?.currentTime).toBeCloseTo(3, 2);
		expect(syncPlayers[1]?.currentTime).toBeCloseTo(1, 2);
		expect(syncPlayers[1]?.play).toHaveBeenCalled();
		expect(previewMonitor.play).toHaveBeenCalled();
		expect(previewMonitor.pause).toHaveBeenCalledTimes(1);
		expect(previewMonitor.currentTime).toBeCloseTo(3, 2);

		view.unmount();
		vi.useRealTimers();
	});

	it("uses Bootstrap tooltips for the solo and mute toggles while preserving accessible labels", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 0,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});

		const view = renderView();
		await flushView();
		await flushView();

		const soloButton = findByTestId(
			view.root,
			"track-solo-toggle-instrument-1",
		);
		const muteButton = findByTestId(
			view.root,
			"track-mute-toggle-instrument-1",
		);

		expect(soloButton.props.title).toBeUndefined();
		expect(soloButton.props["data-bs-toggle"]).toBe("tooltip");
		expect(soloButton.props["data-bs-title"]).toBe("Solo de pista");
		expect(textContent(soloButton)).toContain("Solo");
		expect(muteButton.props.title).toBeUndefined();
		expect(muteButton.props["data-bs-toggle"]).toBe("tooltip");
		expect(muteButton.props["data-bs-title"]).toBe("Silenciar pista");
		expect(textContent(muteButton)).toContain("Silenciar");
		expect(bootstrapTooltipCtor).toHaveBeenCalledWith(soloButton);
		expect(bootstrapTooltipCtor).toHaveBeenCalledWith(muteButton);

		clickButton(soloButton);
		await flushView();

		expect(
			findByTestId(view.root, "track-solo-toggle-instrument-1").props[
				"data-bs-title"
			],
		).toBe("Quitar solo");
		expect(bootstrapTooltipDisposeMock).toHaveBeenCalled();

		view.unmount();

		expect(bootstrapTooltipDisposeMock).toHaveBeenCalled();
	});

	it("shows rounded compact toggle buttons and limits the active visual state to the toggled controls only", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 0,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		const firstSoloButton = findByTestId(
			view.root,
			"track-solo-toggle-instrument-1",
		);
		const firstMuteButton = findByTestId(
			view.root,
			"track-mute-toggle-instrument-1",
		);
		const secondMuteButton = findByTestId(
			view.root,
			"track-mute-toggle-instrument-2",
		);

		expect(String(firstSoloButton.props.class || "")).toContain("rounded-pill");
		expect(firstSoloButton.props.style).toEqual(
			expect.objectContaining({
				minHeight: "unset",
			}),
		);
		expect(String(firstMuteButton.props.class || "")).toContain("rounded-pill");
		expect(String(firstSoloButton.props.class || "")).toContain(
			"btn-outline-secondary",
		);
		expect(String(secondMuteButton.props.class || "")).toContain(
			"btn-outline-secondary",
		);

		clickButton(firstSoloButton);
		await flushView();

		expect(findByTestId(view.root, "sync-audio-instrument-1").muted).toBe(
			false,
		);
		expect(findByTestId(view.root, "sync-audio-instrument-2").muted).toBe(true);
		expect(
			String(
				findByTestId(view.root, "track-solo-toggle-instrument-1").props.class ||
					"",
			),
		).toContain("btn-primary");
		expect(
			String(
				findByTestId(view.root, "track-solo-toggle-instrument-2").props.class ||
					"",
			),
		).toContain("btn-outline-secondary");
		expect(
			String(
				findByTestId(view.root, "track-mute-toggle-instrument-2").props.class ||
					"",
			),
		).toContain("btn-outline-secondary");

		clickButton(firstMuteButton);
		await flushView();

		expect(findByTestId(view.root, "sync-audio-instrument-1").muted).toBe(true);
		expect(
			String(
				findByTestId(view.root, "track-mute-toggle-instrument-1").props.class ||
					"",
			),
		).toContain("btn-warning");
		expect(
			String(
				findByTestId(view.root, "track-solo-toggle-instrument-1").props.class ||
					"",
			),
		).toContain("btn-primary");
		expect(
			String(
				findByTestId(view.root, "track-solo-toggle-instrument-2").props.class ||
					"",
			),
		).toContain("btn-outline-secondary");

		view.unmount();
	});

	it("keeps the songs list order stable while dragging one clip", async () => {
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				upload: { status: "COMPLETED" },
			},
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-2",
				name: "Bajo",
				instrumentId: "catalog-2",
				songId: "song-123",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
				startTimeMs: 6000,
				video: {
					id: "video-2",
					songInstrumentId: "instrument-2",
					url: "https://cdn.example/bass.mp4",
					duration: 9,
					size: 654,
					createdAt: "2026-07-15T10:03:00.000Z",
				},
				upload: { status: "COMPLETED" },
			})
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				startTimeMs: 1000,
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/guitar.mp4",
					duration: 12,
					size: 456,
					createdAt: "2026-07-15T10:02:00.000Z",
				},
				upload: { status: "COMPLETED" },
			});

		const view = renderView();
		await flushView();
		await flushView();

		expect(getTrackNamesInRenderedOrder(view.root)).toEqual([
			"Bajo",
			"Guitarra principal",
		]);
		expect(findByTestId(view.root, "track-clip-instrument-2").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 6000,
			}),
		);

		dragTrackClip(view.root, "instrument-2", 100, 10);
		await flushView();

		expect(getTrackNamesInRenderedOrder(view.root)).toEqual([
			"Bajo",
			"Guitarra principal",
		]);
		expect(findByTestId(view.root, "track-clip-instrument-2").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 2250,
			}),
		);

		view.unmount();
	});

	it("loads the persisted startTimeMs from the video detail payload after reopening the editor", async () => {
		const detailResponse = {
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 0,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
				startTimeMs: 4200,
			},
			upload: { status: "COMPLETED" },
		};
		repositoryGetInstrumentsBySongIdMock.mockResolvedValue([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValue(detailResponse);

		const firstOpen = renderView();
		await flushView();
		await flushView();

		expect(
			findByTestId(firstOpen.root, "track-clip-instrument-1").props,
		).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 4200,
			}),
		);

		firstOpen.unmount();

		const reopened = renderView();
		await flushView();
		await flushView();

		expect(
			findByTestId(reopened.root, "track-clip-instrument-1").props,
		).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 4200,
			}),
		);
		expect(
			queryByTestId(reopened.root, "autosave-saving-icon-instrument-1"),
		).toBeNull();
		expect(
			queryByTestId(reopened.root, "autosave-saved-icon-instrument-1"),
		).toBeNull();

		reopened.unmount();
	});

	it("allows dragged startTimeMs values beyond the clip duration and autosaves the shared timeline offset", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 1000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});
		repositoryUpdateInstrumentVideoStartTimeMock.mockResolvedValue(undefined);

		const view = renderView();
		await flushView();
		await flushView();

		dragTrackClip(view.root, "instrument-1", 100, 400);
		await flushView();
		await vi.advanceTimersByTimeAsync(2500);
		await flushView();

		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 13500,
			}),
		);
		expect(repositoryUpdateInstrumentVideoStartTimeMock).toHaveBeenCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-1"),
			{
				startTimeMs: 13500,
			},
		);

		view.unmount();
		vi.useRealTimers();
	});

	it("lets the user edit startTimeMs manually with large shared-timeline offsets, clamps only negatives, and preserves drag editing", async () => {
		vi.useFakeTimers();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-123",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: { status: "COMPLETED" },
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-123",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			startTimeMs: 1000,
			video: {
				id: "video-1",
				songInstrumentId: "instrument-1",
				url: "https://cdn.example/guitar.mp4",
				duration: 12,
				size: 456,
				createdAt: "2026-07-15T10:02:00.000Z",
			},
			upload: { status: "COMPLETED" },
		});
		repositoryUpdateInstrumentVideoStartTimeMock.mockResolvedValue(undefined);

		const view = renderView();
		await flushView();
		await flushView();

		setInputValue(
			findByTestId(view.root, "track-start-time-input-instrument-1"),
			"999999",
		);
		await flushView();

		expect(
			queryByTestId(view.root, "autosave-saving-icon-instrument-1"),
		).not.toBeNull();

		await vi.advanceTimersByTimeAsync(2500);
		await flushView();

		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 999999,
			}),
		);
		expect(
			repositoryUpdateInstrumentVideoStartTimeMock,
		).toHaveBeenLastCalledWith(
			new SongId("song-123"),
			new SongInstrumentId("instrument-1"),
			{
				startTimeMs: 999999,
			},
		);

		setInputValue(
			findByTestId(view.root, "track-start-time-input-instrument-1"),
			"not-a-number",
		);
		await flushView();

		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 999999,
			}),
		);

		setInputValue(
			findByTestId(view.root, "track-start-time-input-instrument-1"),
			"-50",
		);
		await flushView();

		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 0,
			}),
		);

		dragTrackClip(view.root, "instrument-1", 100, 40);
		await flushView();

		expect(findByTestId(view.root, "track-clip-instrument-1").props).toEqual(
			expect.objectContaining({
				"data-start-time-ms": 0,
			}),
		);
		expect(
			queryByTestId(view.root, "autosave-saving-icon-instrument-1"),
		).not.toBeNull();
		expect(
			queryByTestId(view.root, "autosave-saved-icon-instrument-1"),
		).toBeNull();

		view.unmount();
		vi.useRealTimers();
	});
});

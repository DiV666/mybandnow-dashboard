import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, nextTick } from "vue";
import { Band } from "../../../domain/band/Band.js";
import type { Song } from "../../../domain/song/Song.js";
import type { SongInstrument } from "../../../domain/song/SongInstrument.js";

const {
	sessionStorage,
	repositorySaveMock,
	repositoryGetByBandIdMock,
	repositorySaveInstrumentMock,
	repositoryGetInstrumentsBySongIdMock,
	repositoryGetInstrumentByIdMock,
	repositoryUploadInstrumentVideoMock,
	repositoryCtor,
} = vi.hoisted(() => ({
	sessionStorage: {
		getSelectedBandId: vi.fn<() => string | null>(),
		setSelectedBandId: vi.fn<(bandId: string) => void>(),
		clearSelectedBandId: vi.fn<() => void>(),
		getSkippedBandOnboarding: vi.fn<() => boolean>(),
		setSkippedBandOnboarding: vi.fn<(value: boolean) => void>(),
		clearSkippedBandOnboarding: vi.fn<() => void>(),
	},
	repositorySaveMock: vi.fn<(bandId: string, song: Song) => Promise<void>>(),
	repositoryGetByBandIdMock: vi.fn<(bandId: string) => Promise<unknown[]>>(),
	repositorySaveInstrumentMock:
		vi.fn<(songId: string, instrument: SongInstrument) => Promise<void>>(),
	repositoryGetInstrumentsBySongIdMock:
		vi.fn<(songId: string) => Promise<unknown[]>>(),
	repositoryGetInstrumentByIdMock:
		vi.fn<(songId: string, instrumentId: string) => Promise<unknown>>(),
	repositoryUploadInstrumentVideoMock:
		vi.fn<
			(songId: string, instrumentId: string, videoFile: File) => Promise<void>
		>(),
	repositoryCtor: vi.fn(),
}));

vi.mock("../../../infrastructure/storage/browserSessionStorage.js", () => ({
	browserSessionStorage: sessionStorage,
}));

vi.mock("../../../infrastructure/song/AxiosSongRepository.js", () => ({
	AxiosSongRepository: class {
		constructor() {
			repositoryCtor();
		}

		async save(bandId: string, song: unknown): Promise<void> {
			return repositorySaveMock(bandId, song as Song);
		}

		async getByBandId(bandId: string): Promise<unknown[]> {
			return repositoryGetByBandIdMock(bandId);
		}

		async saveInstrument(songId: string, instrument: unknown): Promise<void> {
			return repositorySaveInstrumentMock(songId, instrument as SongInstrument);
		}

		async getInstrumentsBySongId(songId: string): Promise<unknown[]> {
			return repositoryGetInstrumentsBySongIdMock(songId);
		}

		async getInstrumentById(
			songId: string,
			instrumentId: string,
		): Promise<unknown> {
			return repositoryGetInstrumentByIdMock(songId, instrumentId);
		}

		async uploadInstrumentVideo(
			songId: string,
			instrumentId: string,
			videoFile: File,
		): Promise<void> {
			return repositoryUploadInstrumentVideoMock(
				songId,
				instrumentId,
				videoFile,
			);
		}
	},
}));

import SongsView from "./SongsView.vue";
import { useBandStore } from "../../stores/useBandStore.js";
import { useMusicianStore } from "../../stores/useMusicianStore.js";

type TestTextNode = {
	type: "text" | "comment" | "static";
	text: string;
	parent: TestElementNode | null;
};

type TestElementNode = {
	type: string;
	props: Record<string, unknown>;
	children: TestNode[];
	text: string;
	parent: TestElementNode | null;
	listeners: Record<string, Array<(event: TestEvent) => void>>;
	value?: unknown;
	disabled?: boolean;
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
};

type TestEvent = {
	type: string;
	target?: unknown;
	preventDefault?: () => void;
};

type TestNode = TestTextNode | TestElementNode;

const renderer = createRenderer<TestNode, TestElementNode>({
	patchProp(element, key, _previousValue, nextValue) {
		if (nextValue === null || nextValue === undefined) {
			delete element.props[key];
			if (key === "value") {
				element.value = undefined;
			}
			if (key === "disabled") {
				element.disabled = undefined;
			}
			return;
		}

		element.props[key] = nextValue;
		if (key === "value") {
			element.value = nextValue;
		}
		if (key === "disabled") {
			element.disabled = Boolean(nextValue);
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
		return {
			type,
			props: {},
			children: [],
			text: "",
			parent: null,
			listeners: {},
			addEventListener(eventType, listener) {
				this.listeners[eventType] ??= [];
				this.listeners[eventType].push(listener);
			},
			removeEventListener(eventType, listener) {
				this.listeners[eventType] = (this.listeners[eventType] ?? []).filter(
					(candidate) => candidate !== listener,
				);
			},
			dispatchEvent(event) {
				const nextEvent: TestEvent = {
					preventDefault() {},
					...event,
					target: event.target ?? this,
				};
				for (const listener of this.listeners[nextEvent.type] ?? []) {
					listener(nextEvent);
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
	},
	createText(text) {
		return {
			type: "text",
			text,
			parent: null,
		};
	},
	createComment(text) {
		return {
			type: "comment",
			text,
			parent: null,
		};
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
		const node: TestTextNode = {
			type: "static",
			text: content,
			parent,
		};
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
		addEventListener() {},
		removeEventListener() {},
		dispatchEvent() {},
		getRootNode() {
			return this;
		},
	};
}

function renderSongsView(setup?: () => void) {
	const pinia = createPinia();
	setActivePinia(pinia);
	setup?.();
	const root = createRootNode();
	const app = renderer.createApp(SongsView);
	app.use(pinia);
	app.mount(root);

	return {
		root,
		app,
		unmount: () => app.unmount(),
	};
}

function isElementNode(node: TestNode): node is TestElementNode {
	return (
		node.type !== "text" && node.type !== "comment" && node.type !== "static"
	);
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

function textContent(node: TestNode): string {
	if (!isElementNode(node)) {
		return node.type === "comment" ? "" : node.text;
	}

	return `${node.text}${node.children.map(textContent).join("")}`;
}

function findByText(
	root: TestElementNode,
	text: string,
): TestElementNode | null {
	return findElement(root, (node) => textContent(node).includes(text));
}

function queryInput(root: TestElementNode, id: string): TestElementNode | null {
	return findElement(
		root,
		(node) => node.type === "input" && node.props.id === id,
	);
}

function findInput(root: TestElementNode, id: string): TestElementNode {
	const input = queryInput(root, id);

	if (!input) {
		throw new Error(`Input with id '${id}' was not found.`);
	}

	return input;
}

function findSubmitButton(root: TestElementNode): TestElementNode {
	const button = findElement(
		root,
		(node) => node.type === "button" && node.props.type === "submit",
	);

	if (!button) {
		throw new Error("Submit button was not found.");
	}

	return button;
}

function findButtonByText(
	root: TestElementNode,
	text: string,
): TestElementNode {
	const button = findElement(
		root,
		(node) => node.type === "button" && textContent(node).includes(text),
	);

	if (!button) {
		throw new Error(`Button with text '${text}' was not found.`);
	}

	return button;
}

function findLinkByText(root: TestElementNode, text: string): TestElementNode {
	const link = findElement(
		root,
		(node) => node.type === "a" && textContent(node).includes(text),
	);

	if (!link) {
		throw new Error(`Link with text '${text}' was not found.`);
	}

	return link;
}

function findSongCreationForm(root: TestElementNode): TestElementNode {
	const form = findElement(
		root,
		(node) =>
			node.type === "form" && node.props["data-testid"] === "create-song-form",
	);

	if (!form) {
		throw new Error("Create song form was not found.");
	}

	return form;
}

function findSongInstrumentForm(
	root: TestElementNode,
	songId: string,
): TestElementNode {
	const form = findElement(
		root,
		(node) => node.type === "form" && node.props["data-song-id"] === songId,
	);

	if (!form) {
		throw new Error(`Instrument form for song '${songId}' was not found.`);
	}

	return form;
}

function findSongInstrumentSubmitButton(
	root: TestElementNode,
	songId: string,
	instrumentId: string,
): TestElementNode {
	const form = findSongInstrumentForm(root, `${songId}-${instrumentId}`);
	const button = findElement(
		form,
		(node) => node.type === "button" && node.props.type === "submit",
	);

	if (!button) {
		throw new Error(
			`Upload submit button for instrument '${songId}-${instrumentId}' was not found.`,
		);
	}

	return button;
}

function clickButton(button: TestElementNode) {
	const onClick = button.props.onClick;

	if (typeof onClick !== "function") {
		throw new Error("Click handler was not found.");
	}

	onClick({ preventDefault() {} });
}

function setInputValue(input: TestElementNode, value: string) {
	input.value = value;
	input.dispatchEvent({ type: "input", target: input });
}

function setFileInputValue(input: TestElementNode, files: File[]) {
	const onChange = input.props.onChange;
	const event = {
		target: {
			files,
		},
	};

	if (typeof onChange === "function") {
		onChange(event);
		return;
	}

	input.dispatchEvent({
		type: "change",
		target: event.target,
	});
}

async function submitForm(form: TestElementNode) {
	const onSubmit = form.props.onSubmit;

	if (typeof onSubmit !== "function") {
		throw new Error("Submit handler was not found.");
	}

	await onSubmit({ preventDefault() {} });
}

async function flushView() {
	for (let index = 0; index < 4; index += 1) {
		await Promise.resolve();
		await nextTick();
	}
}

function createBand(id: string, name: string) {
	return Band.fromPrimitives({ id, name });
}

describe("SongsView", () => {
	beforeEach(() => {
		sessionStorage.getSelectedBandId.mockReset();
		sessionStorage.setSelectedBandId.mockReset();
		sessionStorage.clearSelectedBandId.mockReset();
		sessionStorage.getSkippedBandOnboarding.mockReset();
		sessionStorage.setSkippedBandOnboarding.mockReset();
		sessionStorage.clearSkippedBandOnboarding.mockReset();
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(false);
		repositorySaveMock.mockReset();
		repositoryGetByBandIdMock.mockReset();
		repositoryGetByBandIdMock.mockResolvedValue([]);
		repositorySaveInstrumentMock.mockReset();
		repositoryGetInstrumentsBySongIdMock.mockReset();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValue([]);
		repositoryGetInstrumentByIdMock.mockReset();
		repositoryUploadInstrumentVideoMock.mockReset();
		repositoryCtor.mockReset();
		(globalThis as { Document?: typeof Document }).Document ??=
			class Document {} as typeof Document;
		(globalThis as { ShadowRoot?: typeof ShadowRoot }).ShadowRoot ??=
			class ShadowRoot {} as typeof ShadowRoot;
		vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
			"123e4567-e89b-12d3-a456-426614174000",
		);
	});

	it("loads and renders the songs for the selected band", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
			{
				id: "song-2",
				bandId: "band-1",
				title: "Gimme Shelter",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=RbmS3tQJ7Os",
			},
		]);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		expect(repositoryGetByBandIdMock).toHaveBeenCalledWith("band-1");
		expect(findByText(view.root, "Paint It Black")).not.toBeNull();
		expect(findByText(view.root, "Gimme Shelter")).not.toBeNull();
		expect(
			findByText(view.root, "https://www.youtube.com/watch?v=O4irXQhgMqg"),
		).not.toBeNull();

		view.unmount();
	});

	it("loads and renders the instruments for each song", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
			{
				id: "song-2",
				bandId: "band-1",
				title: "Gimme Shelter",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=RbmS3tQJ7Os",
			},
		]);
		repositoryGetInstrumentsBySongIdMock
			.mockResolvedValueOnce([
				{
					id: "instrument-1",
					name: "Guitarra principal",
					instrumentType: "electric-guitar",
					songId: "song-1",
					musicianId: "musician-1",
					createdAt: "2026-07-15T10:00:00.000Z",
				},
			])
			.mockResolvedValueOnce([
				{
					id: "instrument-2",
					name: "Batería",
					instrumentType: "drums",
					songId: "song-2",
					musicianId: "musician-2",
					createdAt: "2026-07-15T10:05:00.000Z",
				},
			]);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		expect(repositoryGetInstrumentsBySongIdMock).toHaveBeenNthCalledWith(
			1,
			"song-1",
		);
		expect(repositoryGetInstrumentsBySongIdMock).toHaveBeenNthCalledWith(
			2,
			"song-2",
		);
		expect(findByText(view.root, "Guitarra principal")).not.toBeNull();
		expect(findByText(view.root, "electric-guitar")).not.toBeNull();
		expect(findByText(view.root, "Batería")).not.toBeNull();
		expect(findByText(view.root, "Añadir instrumento")).not.toBeNull();

		view.unmount();
	});

	it("shows the empty state when the selected band has no songs", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([]);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();

		expect(
			findByText(view.root, "Esta banda todavía no tiene canciones."),
		).not.toBeNull();
		view.unmount();
	});

	it("shows loading and error feedback when the song list request fails", async () => {
		const pendingSongsRequest: {
			reject: ((reason?: unknown) => void) | undefined;
		} = {
			reject: undefined,
		};
		repositoryGetByBandIdMock.mockImplementationOnce(
			() =>
				new Promise<unknown[]>((_resolve, reject) => {
					pendingSongsRequest.reject = reject as (reason?: unknown) => void;
				}),
		);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		expect(findByText(view.root, "Cargando canciones...")).not.toBeNull();

		if (!pendingSongsRequest.reject) {
			throw new Error("The pending songs request promise was not captured.");
		}

		pendingSongsRequest.reject(
			new Error("No se pudieron cargar las canciones."),
		);
		await flushView();

		expect(
			findByText(view.root, "No se pudieron cargar las canciones."),
		).not.toBeNull();
		view.unmount();
	});

	it("reloads the list when the selected band changes and clears it when no band remains selected", async () => {
		repositoryGetByBandIdMock
			.mockResolvedValueOnce([
				{
					id: "song-1",
					bandId: "band-1",
					title: "Paint It Black",
					originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
				},
			])
			.mockResolvedValueOnce([
				{
					id: "song-2",
					bandId: "band-2",
					title: "Gimme Shelter",
					originalVideoclipUrl: "https://www.youtube.com/watch?v=RbmS3tQJ7Os",
				},
			]);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([
				createBand("band-1", "The Stones"),
				createBand("band-2", "The Beatles"),
			]);
		});

		await flushView();
		await flushView();
		expect(findByText(view.root, "Paint It Black")).not.toBeNull();

		const store = useBandStore();
		store.selectBand("band-2");
		await flushView();
		await flushView();

		expect(repositoryGetByBandIdMock).toHaveBeenNthCalledWith(1, "band-1");
		expect(repositoryGetByBandIdMock).toHaveBeenNthCalledWith(2, "band-2");
		expect(findByText(view.root, "Gimme Shelter")).not.toBeNull();
		expect(findByText(view.root, "Paint It Black")).toBeNull();

		store.setBands([]);
		await flushView();
		await flushView();

		expect(
			findByText(view.root, "Selecciona una banda para ver sus canciones."),
		).not.toBeNull();
		expect(findByText(view.root, "Gimme Shelter")).toBeNull();
		view.unmount();
	});

	it("hides the create-song form by default and opens it inside a modal", async () => {
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();

		expect(findByText(view.root, "Crear canción")).not.toBeNull();
		expect(queryInput(view.root, "songTitle")).toBeNull();
		expect(queryInput(view.root, "originalVideoclipUrl")).toBeNull();

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();

		expect(queryInput(view.root, "songTitle")).not.toBeNull();
		expect(queryInput(view.root, "originalVideoclipUrl")).not.toBeNull();
		view.unmount();
	});

	it("disables and guards song creation when no band is selected", async () => {
		const view = renderSongsView();
		expect(
			findByText(
				view.root,
				"Debes seleccionar una banda para crear canciones.",
			),
		).not.toBeNull();
		expect(findByText(view.root, "No hay banda seleccionada.")).not.toBeNull();
		expect(findButtonByText(view.root, "Crear canción").props.disabled).toBe(
			true,
		);

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();

		expect(queryInput(view.root, "songTitle")).toBeNull();
		expect(repositorySaveMock).not.toHaveBeenCalled();
		view.unmount();
	});

	it("shows the validation error and skips saving when the title is empty", async () => {
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();

		setInputValue(findInput(view.root, "songTitle"), "");
		setInputValue(
			findInput(view.root, "originalVideoclipUrl"),
			"https://www.youtube.com/watch?v=O4irXQhgMqg",
		);
		await flushView();

		await submitForm(findSongCreationForm(view.root));
		await flushView();

		expect(repositorySaveMock).not.toHaveBeenCalled();
		expect(findByText(view.root, "SongTitle cannot be empty")).not.toBeNull();
		expect(findSubmitButton(view.root).props.disabled).toBe(false);
		view.unmount();
	});

	it("refreshes the list after creating a song successfully", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositorySaveMock.mockResolvedValueOnce(undefined);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		expect(
			findByText(view.root, "Esta banda todavía no tiene canciones."),
		).not.toBeNull();

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();

		setInputValue(findInput(view.root, "songTitle"), "Paint It Black");
		setInputValue(
			findInput(view.root, "originalVideoclipUrl"),
			"https://www.youtube.com/watch?v=O4irXQhgMqg",
		);
		await flushView();

		await submitForm(findSongCreationForm(view.root));
		await flushView();

		expect(repositoryGetByBandIdMock).toHaveBeenNthCalledWith(1, "band-1");
		expect(repositoryGetByBandIdMock).toHaveBeenNthCalledWith(2, "band-1");
		expect(findByText(view.root, "Paint It Black")).not.toBeNull();
		expect(
			findByText(view.root, "Canción creada correctamente."),
		).not.toBeNull();
		expect(queryInput(view.root, "songTitle")).toBeNull();

		view.unmount();
	});

	it("does not reload the previous band's songs if the selection changes while creation is in flight", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
			{
				id: "song-2",
				bandId: "band-2",
				title: "Gimme Shelter",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=RbmS3tQJ7Os",
			},
		]);
		const pendingCreation: {
			resolve: (() => void) | undefined;
		} = {
			resolve: undefined,
		};
		repositorySaveMock.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					pendingCreation.resolve = resolve;
				}),
		);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([
				createBand("band-1", "The Stones"),
				createBand("band-2", "The Beatles"),
			]);
		});

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();

		setInputValue(findInput(view.root, "songTitle"), "Paint It Black");
		setInputValue(
			findInput(view.root, "originalVideoclipUrl"),
			"https://www.youtube.com/watch?v=O4irXQhgMqg",
		);
		await flushView();

		const submitPromise = submitForm(findSongCreationForm(view.root));
		await flushView();

		const store = useBandStore();
		store.selectBand("band-2");
		await flushView();

		if (!pendingCreation.resolve) {
			throw new Error("The pending song creation promise was not captured.");
		}

		pendingCreation.resolve();
		await submitPromise;
		await flushView();

		expect(repositoryGetByBandIdMock).toHaveBeenNthCalledWith(1, "band-1");
		expect(repositoryGetByBandIdMock).toHaveBeenNthCalledWith(2, "band-2");
		expect(repositoryGetByBandIdMock).toHaveBeenCalledTimes(2);
		expect(findByText(view.root, "Gimme Shelter")).not.toBeNull();
		expect(findByText(view.root, "Paint It Black")).toBeNull();
		view.unmount();
	});

	it("submits with the selected band, clears the fields, and shows success feedback", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([]);
		repositorySaveMock.mockResolvedValueOnce(undefined);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();

		setInputValue(findInput(view.root, "songTitle"), "Paint It Black");
		setInputValue(
			findInput(view.root, "originalVideoclipUrl"),
			"https://www.youtube.com/watch?v=O4irXQhgMqg",
		);
		await flushView();

		await submitForm(findSongCreationForm(view.root));
		await flushView();

		expect(repositoryCtor).toHaveBeenCalledOnce();
		expect(repositorySaveMock).toHaveBeenCalledOnce();
		const [savedBandId, savedSong] = repositorySaveMock.mock.calls[0];
		expect(savedBandId).toBe("band-1");
		expect(savedSong.toPrimitives()).toEqual({
			id: "123e4567-e89b-12d3-a456-426614174000",
			title: "Paint It Black",
			originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
		});
		expect(queryInput(view.root, "songTitle")).toBeNull();
		expect(
			findByText(view.root, "Canción creada correctamente."),
		).not.toBeNull();

		view.unmount();
	});

	it("shows the duplicate-song message when the backend returns 409", async () => {
		repositorySaveMock.mockRejectedValueOnce({
			response: {
				status: 409,
			},
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();

		setInputValue(findInput(view.root, "songTitle"), "Paint It Black");
		setInputValue(
			findInput(view.root, "originalVideoclipUrl"),
			"https://www.youtube.com/watch?v=O4irXQhgMqg",
		);
		await flushView();

		await submitForm(findSongCreationForm(view.root));
		await flushView();

		expect(
			findByText(
				view.root,
				"Ya existe una canción con esos datos. Inténtalo de nuevo.",
			),
		).not.toBeNull();
		expect(findSubmitButton(view.root).props.disabled).toBe(false);
		view.unmount();
	});

	it("allows adding an instrument inline with the logged-in musician profile id", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					id: "instrument-1",
					name: "Guitarra principal",
					instrumentType: "electric-guitar",
					songId: "song-1",
					musicianId: "musician-1",
					createdAt: "2026-07-15T10:00:00.000Z",
				},
			]);
		repositorySaveInstrumentMock.mockResolvedValueOnce(undefined);
		const view = renderSongsView(() => {
			const bandStore = useBandStore();
			bandStore.setBands([createBand("band-1", "The Stones")]);
			const musicianStore = useMusicianStore();
			musicianStore.profile = {
				id: "musician-1",
				userId: "user-1",
				username: "keith",
				name: "Keith Richards",
			};
		});

		await flushView();
		await flushView();

		clickButton(findButtonByText(view.root, "Añadir instrumento"));
		await flushView();

		setInputValue(
			findInput(view.root, "songInstrumentName-song-1"),
			"Guitarra principal",
		);
		setInputValue(
			findInput(view.root, "songInstrumentType-song-1"),
			"electric-guitar",
		);
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1"));
		await flushView();
		await flushView();

		expect(repositorySaveInstrumentMock).toHaveBeenCalledOnce();
		const [savedSongId, savedInstrument] =
			repositorySaveInstrumentMock.mock.calls[0];
		expect(savedSongId).toBe("song-1");
		expect(savedInstrument.toPrimitives()).toEqual({
			id: "123e4567-e89b-12d3-a456-426614174000",
			name: "Guitarra principal",
			instrumentType: "electric-guitar",
			musicianId: "musician-1",
		});
		expect(repositoryGetInstrumentsBySongIdMock).toHaveBeenNthCalledWith(
			1,
			"song-1",
		);
		expect(repositoryGetInstrumentsBySongIdMock).toHaveBeenNthCalledWith(
			2,
			"song-1",
		);
		expect(findByText(view.root, "Guitarra principal")).not.toBeNull();

		view.unmount();
	});

	it("shows a view video action after the processed video becomes available", async () => {
		vi.useFakeTimers();
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: null,
			},
		]);
		repositoryUploadInstrumentVideoMock.mockResolvedValueOnce(undefined);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				video: null,
				upload: {
					status: "PROCESSING",
				},
			})
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/video-1.mp4",
					duration: 123,
					size: 456,
					createdAt: "2026-07-15T10:06:00.000Z",
				},
				upload: {
					status: "COMPLETED",
				},
			});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});
		setFileInputValue(fileInput, [videoFile]);
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1-instrument-1"));
		await flushView();
		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		await vi.advanceTimersByTimeAsync(5000);
		await flushView();

		expect(findByText(view.root, "Video disponible.")).not.toBeNull();
		expect(
			findByText(view.root, "songInstrumentVideo-song-1-instrument-1"),
		).toBeNull();

		const viewVideoLink = findLinkByText(view.root, "Ver video");
		expect(viewVideoLink.props.href).toBe("https://cdn.example/video-1.mp4");
		expect(viewVideoLink.props.target).toBe("_blank");
		expect(viewVideoLink.props.rel).toBe("noreferrer noopener");
		expect(findByText(view.root, "<video")).toBeNull();

		view.unmount();
		vi.useRealTimers();
	});

	it("keeps the upload in progress after 202 until the backend detail reports a completed video", async () => {
		vi.useFakeTimers();
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: null,
			},
		]);
		repositoryUploadInstrumentVideoMock.mockResolvedValueOnce(undefined);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				video: null,
				upload: {
					status: "PROCESSING",
				},
			})
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/video-1.mp4",
					duration: 123,
					size: 456,
					createdAt: "2026-07-15T10:06:00.000Z",
				},
				upload: {
					status: "COMPLETED",
				},
			});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});
		setFileInputValue(fileInput, [videoFile]);
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1-instrument-1"));
		await flushView();

		expect(repositoryUploadInstrumentVideoMock).toHaveBeenCalledOnce();
		expect(findByText(view.root, "Video subido correctamente.")).toBeNull();
		expect(findByText(view.root, "Procesando video...")).not.toBeNull();

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		expect(repositoryGetInstrumentByIdMock).toHaveBeenNthCalledWith(
			1,
			"song-1",
			"instrument-1",
		);

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		expect(repositoryGetInstrumentByIdMock).toHaveBeenNthCalledWith(
			2,
			"song-1",
			"instrument-1",
		);
		expect(findByText(view.root, "Video disponible.")).not.toBeNull();
		expect(
			findByText(view.root, "songInstrumentVideo-song-1-instrument-1"),
		).toBeNull();

		view.unmount();
		vi.useRealTimers();
	});

	it("does one extra detail read when processing completes before the video becomes available", async () => {
		vi.useFakeTimers();
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				upload: null,
			},
		]);
		repositoryUploadInstrumentVideoMock.mockResolvedValueOnce(undefined);
		repositoryGetInstrumentByIdMock
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				video: null,
				upload: {
					status: "COMPLETED",
				},
			})
			.mockResolvedValueOnce({
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
				video: {
					id: "video-1",
					songInstrumentId: "instrument-1",
					url: "https://cdn.example/video-1.mp4",
					duration: 123,
					size: 456,
					createdAt: "2026-07-15T10:06:00.000Z",
				},
				upload: {
					status: "COMPLETED",
				},
			});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});
		setFileInputValue(fileInput, [videoFile]);
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1-instrument-1"));
		await flushView();

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		expect(repositoryGetInstrumentByIdMock).toHaveBeenNthCalledWith(
			1,
			"song-1",
			"instrument-1",
		);

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		expect(repositoryGetInstrumentByIdMock).toHaveBeenCalledTimes(2);
		expect(findByText(view.root, "Video disponible.")).not.toBeNull();

		view.unmount();
		vi.useRealTimers();
	});

	it("disables the upload submit button until a valid MP4 file is selected", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		expect(
			findSongInstrumentSubmitButton(view.root, "song-1", "instrument-1").props
				.disabled,
		).toBe(true);

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});
		setFileInputValue(fileInput, [videoFile]);
		await flushView();

		expect(
			findSongInstrumentSubmitButton(view.root, "song-1", "instrument-1").props
				.disabled,
		).toBe(false);

		view.unmount();
	});

	it("keeps the upload submit button disabled after an invalid file selection", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		setFileInputValue(fileInput, [
			new File(["audio-bytes"], "riff.mp3", { type: "audio/mpeg" }),
		]);
		await flushView();

		expect(
			findSongInstrumentSubmitButton(view.root, "song-1", "instrument-1").props
				.disabled,
		).toBe(true);

		view.unmount();
	});

	it("starts the async upload status flow after the backend accepts the video", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		repositoryUploadInstrumentVideoMock.mockResolvedValueOnce(undefined);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});
		setFileInputValue(fileInput, [videoFile]);
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1-instrument-1"));
		await flushView();

		expect(repositoryUploadInstrumentVideoMock).toHaveBeenCalledOnce();
		expect(repositoryUploadInstrumentVideoMock).toHaveBeenCalledWith(
			"song-1",
			"instrument-1",
			videoFile,
		);
		expect(findByText(view.root, "Procesando video...")).not.toBeNull();
		expect(findByText(view.root, "Video subido correctamente.")).toBeNull();
		expect(findByText(view.root, "Ver video")).toBeNull();

		view.unmount();
	});

	it("rejects non-MP4 files before calling the upload use case", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		setFileInputValue(fileInput, [
			new File(["audio-bytes"], "riff.mp3", { type: "audio/mpeg" }),
		]);
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1-instrument-1"));
		await flushView();

		expect(repositoryUploadInstrumentVideoMock).not.toHaveBeenCalled();
		expect(
			findByText(view.root, "El vídeo tiene que estar en formato MP4."),
		).not.toBeNull();

		view.unmount();
	});

	it("shows an inline error when the musician profile is unavailable", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		clickButton(findButtonByText(view.root, "Añadir instrumento"));
		await flushView();
		setInputValue(
			findInput(view.root, "songInstrumentName-song-1"),
			"Guitarra principal",
		);
		setInputValue(
			findInput(view.root, "songInstrumentType-song-1"),
			"electric-guitar",
		);
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1"));
		await flushView();

		expect(repositorySaveInstrumentMock).not.toHaveBeenCalled();
		expect(
			findByText(
				view.root,
				"Debes completar tu perfil de músico para añadir instrumentos.",
			),
		).not.toBeNull();

		view.unmount();
	});

	it("shows a timeout-specific message when the upload request exceeds the endpoint timeout", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		repositoryUploadInstrumentVideoMock.mockRejectedValueOnce({
			code: "ECONNABORTED",
			message: "timeout of 60000ms exceeded",
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		setFileInputValue(fileInput, [
			new File(["video-bytes"], "riff.mp4", { type: "video/mp4" }),
		]);
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1-instrument-1"));
		await flushView();

		expect(
			findByText(view.root, "La subida tardó demasiado. Inténtalo de nuevo."),
		).not.toBeNull();
		expect(
			findByText(view.root, "La subida se canceló antes de terminar."),
		).toBeNull();

		view.unmount();
	});

	it("shows the cancellation message only for real user-side cancellations", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentType: "electric-guitar",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		repositoryUploadInstrumentVideoMock.mockRejectedValueOnce({
			code: "ERR_CANCELED",
			message: "canceled",
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		setFileInputValue(fileInput, [
			new File(["video-bytes"], "riff.mp4", { type: "video/mp4" }),
		]);
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1-instrument-1"));
		await flushView();

		expect(
			findByText(view.root, "La subida se canceló antes de terminar."),
		).not.toBeNull();
		expect(
			findByText(view.root, "La subida tardó demasiado. Inténtalo de nuevo."),
		).toBeNull();

		view.unmount();
	});

	it("resets loading and shows an error message when song creation fails", async () => {
		const pendingCreation: {
			reject: ((reason?: unknown) => void) | undefined;
		} = {
			reject: undefined,
		};
		repositorySaveMock.mockImplementationOnce(
			() =>
				new Promise<void>((_resolve, reject) => {
					pendingCreation.reject = reject as (reason?: unknown) => void;
				}),
		);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();

		setInputValue(findInput(view.root, "songTitle"), "Paint It Black");
		setInputValue(
			findInput(view.root, "originalVideoclipUrl"),
			"https://www.youtube.com/watch?v=O4irXQhgMqg",
		);
		await flushView();

		const submitPromise = submitForm(findSongCreationForm(view.root));
		await flushView();

		expect(findSubmitButton(view.root).props.disabled).toBe(true);
		expect(textContent(findSubmitButton(view.root))).toContain("Creando...");

		if (!pendingCreation.reject) {
			throw new Error("The pending song creation promise was not captured.");
		}

		pendingCreation.reject(new Error("No se pudo crear la canción."));
		await submitPromise;
		await flushView();

		expect(findSubmitButton(view.root).props.disabled).toBe(false);
		expect(textContent(findSubmitButton(view.root))).toContain("Crear canción");
		expect(
			findByText(view.root, "No se pudo crear la canción."),
		).not.toBeNull();

		view.unmount();
	});
});

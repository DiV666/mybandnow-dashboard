import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, nextTick } from "vue";
import { Band } from "../../../domain/band/Band.js";
import { MusicianEmail } from "../../../domain/musician/value-object/MusicianEmail.js";
import type { Song } from "../../../domain/song/Song.js";
import type { SongInstrument } from "../../../domain/song/SongInstrument.js";

const {
	sessionStorage,
	repositorySaveMock,
	repositoryGetByBandIdMock,
	repositorySaveInstrumentMock,
	repositoryGetInstrumentsBySongIdMock,
	repositoryGetInstrumentByIdMock,
	repositoryAssignMusicianMock,
	repositoryUploadInstrumentVideoMock,
	instrumentRepositoryGetAllMock,
	instrumentRepositoryGetByIdMock,
	musicianRepositoryGetByIdMock,
	repositoryCtor,
	instrumentRepositoryCtor,
	musicianRepositoryCtor,
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
	repositoryAssignMusicianMock:
		vi.fn<
			(
				songId: string,
				instrumentId: string,
				musicianEmail: string,
			) => Promise<void>
		>(),
	repositoryUploadInstrumentVideoMock:
		vi.fn<
			(songId: string, instrumentId: string, videoFile: File) => Promise<void>
		>(),
	instrumentRepositoryGetAllMock: vi.fn<() => Promise<unknown[]>>(),
	instrumentRepositoryGetByIdMock:
		vi.fn<(instrumentId: string) => Promise<unknown>>(),
	musicianRepositoryGetByIdMock:
		vi.fn<(musicianId: string) => Promise<unknown>>(),
	repositoryCtor: vi.fn(),
	instrumentRepositoryCtor: vi.fn(),
	musicianRepositoryCtor: vi.fn(),
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

		async assignMusician(
			songId: string,
			instrumentId: string,
			musicianEmail: string,
		): Promise<void> {
			return repositoryAssignMusicianMock(songId, instrumentId, musicianEmail);
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

vi.mock(
	"../../../infrastructure/instrument/AxiosInstrumentRepository.js",
	() => ({
		AxiosInstrumentRepository: class {
			constructor() {
				instrumentRepositoryCtor();
			}

			async getAll(): Promise<unknown[]> {
				return instrumentRepositoryGetAllMock();
			}

			async getById(instrumentId: string): Promise<unknown> {
				return instrumentRepositoryGetByIdMock(instrumentId);
			}
		},
	}),
);

vi.mock("../../../infrastructure/musician/AxiosMusicianRepository.js", () => ({
	AxiosMusicianRepository: class {
		constructor() {
			musicianRepositoryCtor();
		}

		async getById(musicianId: string): Promise<unknown> {
			return musicianRepositoryGetByIdMock(musicianId);
		}

		async getProfile(): Promise<null> {
			return null;
		}

		async createProfile(): Promise<void> {
			return;
		}
	},
}));

import SongsView from "./SongsView.vue";
import { useBandStore } from "../../stores/useBandStore.js";
import { useMusicianStore } from "../../stores/useMusicianStore.js";
import { useToastStore } from "../../stores/useToastStore.js";

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
	selected?: boolean;
	selectedIndex?: number;
	options?: TestElementNode[];
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
			selected: false,
			selectedIndex: -1,
			get options() {
				return this.children.filter(
					(child) => (child as TestElementNode).type === "option",
				) as TestElementNode[];
			},
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

function querySelect(
	root: TestElementNode,
	id: string,
): TestElementNode | null {
	return findElement(
		root,
		(node) => node.type === "select" && node.props.id === id,
	);
}

function findSelect(root: TestElementNode, id: string): TestElementNode {
	const select = querySelect(root, id);

	if (!select) {
		throw new Error(`Select with id '${id}' was not found.`);
	}

	return select;
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

function querySongInstrumentForm(
	root: TestElementNode,
	songId: string,
): TestElementNode | null {
	return findElement(
		root,
		(node) => node.type === "form" && node.props["data-song-id"] === songId,
	);
}

function findSongInstrumentForm(
	root: TestElementNode,
	songId: string,
): TestElementNode {
	const form = querySongInstrumentForm(root, songId);

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

function queryByTestId(
	root: TestElementNode,
	testId: string,
): TestElementNode | null {
	return findElement(root, (node) => node.props["data-testid"] === testId);
}

function findByTestId(root: TestElementNode, testId: string): TestElementNode {
	const element = queryByTestId(root, testId);

	if (!element) {
		throw new Error(`Element with test id '${testId}' was not found.`);
	}

	return element;
}

function findSongArticle(
	root: TestElementNode,
	songTitle: string,
): TestElementNode {
	const article = findElement(
		root,
		(node) => node.type === "article" && textContent(node).includes(songTitle),
	);

	if (!article) {
		throw new Error(`Song article for '${songTitle}' was not found.`);
	}

	return article;
}

function querySongInstrumentModal(
	root: TestElementNode,
	songId: string,
): TestElementNode | null {
	return findElement(
		root,
		(node) =>
			node.type === "div" &&
			node.props.role === "dialog" &&
			node.props["aria-labelledby"] ===
				`createSongInstrumentModalTitle-${songId}`,
	);
}

function hasAncestorOfType(node: TestElementNode, type: string): boolean {
	let current = node.parent;
	while (current) {
		if (current.type === type) {
			return true;
		}
		current = current.parent;
	}
	return false;
}

function clickButton(button: TestElementNode) {
	const onClick = button.props.onClick;

	if (typeof onClick !== "function") {
		throw new Error("Click handler was not found.");
	}

	onClick({ preventDefault() {} });
}

async function openUploadModal(root: TestElementNode) {
	clickButton(findButtonByText(root, "Subir vídeo"));
	await flushView();
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

function setSelectValue(select: TestElementNode, value: string) {
	select.value = value;
	const options = select.options ?? [];
	options.forEach((option, index) => {
		const isSelected = option.props.value === value;
		option.selected = isSelected;
		if (isSelected) {
			select.selectedIndex = index;
		}
	});
	select.dispatchEvent({ type: "change", target: select });
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
	for (let index = 0; index < 8; index += 1) {
		await Promise.resolve();
		await nextTick();
	}
}

function createBand(id: string, name: string) {
	return Band.fromPrimitives({ id, name });
}

function getBodyOverflow(): string {
	const documentRef = globalThis.document as
		| { body?: { style?: { overflow?: string } } }
		| undefined;
	return documentRef?.body?.style?.overflow ?? "";
}

describe("SongsView", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
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
		repositoryAssignMusicianMock.mockReset();
		repositoryUploadInstrumentVideoMock.mockReset();
		instrumentRepositoryGetAllMock.mockReset();
		instrumentRepositoryGetAllMock.mockResolvedValue([]);
		instrumentRepositoryGetByIdMock.mockReset();
		musicianRepositoryGetByIdMock.mockReset();
		repositoryCtor.mockReset();
		instrumentRepositoryCtor.mockReset();
		musicianRepositoryCtor.mockReset();
		useToastStore().clear();
		(globalThis as { Document?: typeof Document }).Document ??=
			class Document {} as typeof Document;
		(globalThis as { ShadowRoot?: typeof ShadowRoot }).ShadowRoot ??=
			class ShadowRoot {} as typeof ShadowRoot;
		(
			globalThis as {
				document?: {
					body: {
						style: {
							overflow: string;
						};
					};
				};
			}
		).document = {
			body: {
				style: {
					overflow: "",
				},
			},
		};
		vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
			"123e4567-e89b-12d3-a456-426614174000",
		);
	});

	it("renders each song instruments inside a table with row actions", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		instrumentRepositoryGetAllMock.mockResolvedValueOnce([]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		instrumentRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "catalog-1",
			name: "Electric Guitar",
			description: "Amplified guitar",
			createdAt: "2026-07-15T09:55:00.000Z",
		});
		musicianRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "musician-1",
			name: "Keith Richards",
			username: "keith",
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		expect(repositoryGetByBandIdMock).toHaveBeenCalledWith("band-1");
		expect(musicianRepositoryGetByIdMock).toHaveBeenCalledWith("musician-1");
		expect(findByText(view.root, "Paint It Black")).not.toBeNull();
		const table = findElement(view.root, (node) => node.type === "table");
		expect(table).not.toBeNull();
		expect(textContent(table as TestElementNode)).toContain(
			"Título de la pista",
		);
		expect(textContent(table as TestElementNode)).toContain("Instrumento");
		expect(textContent(table as TestElementNode)).toContain("Músico");
		expect(textContent(table as TestElementNode)).toContain("Acciones");
		expect(textContent(table as TestElementNode)).toContain("#1");
		expect(textContent(table as TestElementNode)).toContain(
			"Guitarra principal",
		);
		expect(textContent(table as TestElementNode)).toContain("Electric Guitar");
		expect(textContent(table as TestElementNode)).toContain("Keith Richards");
		expect(textContent(table as TestElementNode)).not.toContain("musician-1");
		expect(textContent(table as TestElementNode)).toContain("Editar");
		expect(textContent(table as TestElementNode)).toContain("Subir vídeo");
		expect(textContent(table as TestElementNode)).toContain("Asignar músico");
		expect(findByText(view.root, "Ver en YouTube")).not.toBeNull();

		view.unmount();
	});

	it("falls back to the musician username and caches lookups for repeated musician ids", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		instrumentRepositoryGetAllMock.mockResolvedValueOnce([]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-1",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
			{
				id: "instrument-2",
				name: "Guitarra rítmica",
				instrumentId: "catalog-1",
				songId: "song-1",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
			},
		]);
		instrumentRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "catalog-1",
			name: "Electric Guitar",
			description: "Amplified guitar",
			createdAt: "2026-07-15T09:55:00.000Z",
		});
		musicianRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "musician-2",
			name: "",
			username: "ronnie",
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		expect(musicianRepositoryGetByIdMock).toHaveBeenCalledTimes(1);
		expect(musicianRepositoryGetByIdMock).toHaveBeenCalledWith("musician-2");
		expect(findByText(view.root, "@ronnie")).not.toBeNull();
		expect(textContent(view.root)).not.toContain("musician-2");

		view.unmount();
	});

	it("loads and renders the instruments for each song using the catalog detail name", async () => {
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
		instrumentRepositoryGetAllMock.mockResolvedValueOnce([
			{
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T09:55:00.000Z",
			},
			{
				id: "catalog-2",
				name: "Drums",
				description: "Acoustic drum kit",
				createdAt: "2026-07-15T09:56:00.000Z",
			},
		]);
		repositoryGetInstrumentsBySongIdMock
			.mockResolvedValueOnce([
				{
					id: "instrument-1",
					name: "Guitarra principal",
					instrumentId: "catalog-1",
					songId: "song-1",
					musicianId: "musician-1",
					createdAt: "2026-07-15T10:00:00.000Z",
				},
			])
			.mockResolvedValueOnce([
				{
					id: "instrument-2",
					name: "Batería",
					instrumentId: "catalog-2",
					songId: "song-2",
					musicianId: "musician-2",
					createdAt: "2026-07-15T10:05:00.000Z",
				},
			]);
		instrumentRepositoryGetByIdMock
			.mockResolvedValueOnce({
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T09:55:00.000Z",
			})
			.mockResolvedValueOnce({
				id: "catalog-2",
				name: "Drums",
				description: "Acoustic drum kit",
				createdAt: "2026-07-15T09:56:00.000Z",
			});
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
		expect(instrumentRepositoryGetByIdMock).toHaveBeenNthCalledWith(
			1,
			"catalog-1",
		);
		expect(instrumentRepositoryGetByIdMock).toHaveBeenNthCalledWith(
			2,
			"catalog-2",
		);
		expect(findByText(view.root, "Guitarra principal")).not.toBeNull();
		expect(findByText(view.root, "Electric Guitar")).not.toBeNull();
		expect(findByText(view.root, "Batería")).not.toBeNull();
		expect(findByText(view.root, "Drums")).not.toBeNull();
		expect(findByText(view.root, "Añadir instrumento")).not.toBeNull();

		view.unmount();
	});

	it("caches catalog instrument detail reads when multiple song tracks share the same instrument id", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		instrumentRepositoryGetAllMock.mockResolvedValueOnce([
			{
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T09:55:00.000Z",
			},
		]);
		repositoryGetInstrumentsBySongIdMock.mockResolvedValueOnce([
			{
				id: "instrument-1",
				name: "Guitarra principal",
				instrumentId: "catalog-1",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
			{
				id: "instrument-2",
				name: "Guitarra rítmica",
				instrumentId: "catalog-1",
				songId: "song-1",
				musicianId: "musician-2",
				createdAt: "2026-07-15T10:01:00.000Z",
			},
		]);
		instrumentRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "catalog-1",
			name: "Electric Guitar",
			description: "Amplified guitar",
			createdAt: "2026-07-15T09:55:00.000Z",
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		expect(instrumentRepositoryGetByIdMock).toHaveBeenCalledTimes(1);
		expect(instrumentRepositoryGetByIdMock).toHaveBeenCalledWith("catalog-1");
		expect(findByText(view.root, "Guitarra principal")).not.toBeNull();
		expect(findByText(view.root, "Guitarra rítmica")).not.toBeNull();
		expect(findByText(view.root, "Electric Guitar")).not.toBeNull();

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
		).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "error",
				message: "No se pudieron cargar las canciones.",
			}),
		]);
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

	it("does not render the selected-band summary card", async () => {
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();

		expect(findByText(view.root, "Banda seleccionada:")).toBeNull();
		expect(
			findByText(
				view.root,
				"Debes seleccionar una banda para crear canciones.",
			),
		).toBeNull();
		expect(findButtonByText(view.root, "Crear canción").props.disabled).toBe(
			false,
		);

		view.unmount();
	});

	it("keeps song creation disabled without rendering the selected-band summary card", async () => {
		const view = renderSongsView();

		expect(findByText(view.root, "Banda seleccionada:")).toBeNull();
		expect(findByText(view.root, "No hay banda seleccionada.")).toBeNull();
		expect(
			findByText(
				view.root,
				"Debes seleccionar una banda para crear canciones.",
			),
		).toBeNull();
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
		expect(findByText(view.root, "SongTitle cannot be empty")).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "error",
				message: "SongTitle cannot be empty",
			}),
		]);
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
		expect(queryInput(view.root, "songTitle")).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "success",
				message: "Canción creada correctamente.",
			}),
		]);

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
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "success",
				message: "Canción creada correctamente.",
			}),
		]);

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
		).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "error",
				message: "Ya existe una canción con esos datos. Inténtalo de nuevo.",
			}),
		]);
		expect(findSubmitButton(view.root).props.disabled).toBe(false);
		view.unmount();
	});

	it("locks body scroll while the create-song modal is open and restores it after closing", async () => {
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		expect(getBodyOverflow()).toBe("");

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();
		expect(getBodyOverflow()).toBe("hidden");

		clickButton(findButtonByText(view.root, "Cancelar"));
		await flushView();
		expect(getBodyOverflow()).toBe("");

		view.unmount();
	});

	it("locks body scroll while the instrument modal is open and restores it after closing", async () => {
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
		expect(getBodyOverflow()).toBe("");

		clickButton(findButtonByText(view.root, "Añadir instrumento"));
		await flushView();
		expect(getBodyOverflow()).toBe("hidden");

		clickButton(findButtonByText(view.root, "Cancelar"));
		await flushView();
		expect(getBodyOverflow()).toBe("");

		view.unmount();
	});

	it("keeps body scroll locked until the last open modal closes", async () => {
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

		clickButton(findButtonByText(view.root, "Crear canción"));
		await flushView();
		clickButton(findButtonByText(view.root, "Añadir instrumento"));
		await flushView();
		expect(getBodyOverflow()).toBe("hidden");

		const cancelButtons = findElements(
			view.root,
			(node) =>
				node.type === "button" && textContent(node).includes("Cancelar"),
		);
		clickButton(cancelButtons[0]);
		await flushView();
		expect(getBodyOverflow()).toBe("hidden");

		clickButton(cancelButtons[1]);
		await flushView();
		expect(getBodyOverflow()).toBe("");

		view.unmount();
	});

	it("renders the instrument creation modal as a top-level overlay instead of nesting it inside the song article", async () => {
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

		const songArticle = findSongArticle(view.root, "Paint It Black");
		const modal = querySongInstrumentModal(view.root, "song-1");
		const backdrops = findElements(
			view.root,
			(node) =>
				node.type === "div" &&
				String(node.props.class).includes("modal-backdrop"),
		);

		expect(modal).not.toBeNull();
		expect(hasAncestorOfType(modal as TestElementNode, "article")).toBe(false);
		expect(findElement(songArticle, (node) => node === modal)).toBeNull();
		expect(backdrops).toHaveLength(1);
		expect(hasAncestorOfType(backdrops[0], "article")).toBe(false);

		view.unmount();
	});

	it("keeps a single top-level instrument modal while switching the selected song context", async () => {
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

		const addInstrumentButtons = findElements(
			view.root,
			(node) =>
				node.type === "button" &&
				textContent(node).includes("Añadir instrumento"),
		);
		clickButton(addInstrumentButtons[0]);
		await flushView();
		expect(
			findByText(view.root, "Añadir instrumento a Paint It Black"),
		).not.toBeNull();

		clickButton(addInstrumentButtons[1]);
		await flushView();

		const modals = findElements(
			view.root,
			(node) => node.type === "div" && node.props.role === "dialog",
		);
		const backdrops = findElements(
			view.root,
			(node) =>
				node.type === "div" &&
				String(node.props.class).includes("modal-backdrop"),
		);

		expect(modals).toHaveLength(1);
		expect(backdrops).toHaveLength(1);
		expect(
			findByText(view.root, "Añadir instrumento a Gimme Shelter"),
		).not.toBeNull();
		expect(queryInput(view.root, "songInstrumentName-song-1")).toBeNull();
		expect(queryInput(view.root, "songInstrumentName-song-2")).not.toBeNull();

		view.unmount();
	});

	it("opens the instrument form in a modal with a track-name label and catalog selector", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		instrumentRepositoryGetAllMock.mockResolvedValueOnce([
			{
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T09:55:00.000Z",
			},
		]);
		repositoryGetInstrumentsBySongIdMock
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					id: "instrument-1",
					name: "Guitarra principal",
					instrumentId: "catalog-1",
					songId: "song-1",
					musicianId: "musician-1",
					createdAt: "2026-07-15T10:00:00.000Z",
				},
			]);
		repositorySaveInstrumentMock.mockResolvedValueOnce(undefined);
		instrumentRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "catalog-1",
			name: "Electric Guitar",
			description: "Amplified guitar",
			createdAt: "2026-07-15T09:55:00.000Z",
		});
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

		expect(queryInput(view.root, "songInstrumentName-song-1")).toBeNull();
		const instrumentsHeader = findByTestId(
			view.root,
			"song-instruments-header-song-1",
		);
		expect(String(instrumentsHeader.props.class)).toContain(
			"justify-content-between",
		);
		const addInstrumentButton = findButtonByText(
			view.root,
			"Añadir instrumento",
		);
		expect(String(addInstrumentButton.props.class)).toContain("small");

		clickButton(addInstrumentButton);
		await flushView();

		expect(
			findByText(view.root, "Añadir instrumento a Paint It Black"),
		).not.toBeNull();
		expect(findByText(view.root, "Nombre de la pista")).not.toBeNull();
		const instrumentSelect = findSelect(view.root, "songInstrumentId-song-1");
		expect(textContent(instrumentSelect)).toContain("Electric Guitar");
		setInputValue(
			findInput(view.root, "songInstrumentName-song-1"),
			"Guitarra principal",
		);
		setSelectValue(instrumentSelect, "catalog-1");
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "song-1"));
		await flushView();
		await flushView();

		expect(instrumentRepositoryGetAllMock).toHaveBeenCalledTimes(1);
		expect(repositorySaveInstrumentMock).toHaveBeenCalledOnce();
		const [savedSongId, savedInstrument] =
			repositorySaveInstrumentMock.mock.calls[0];
		expect(savedSongId).toBe("song-1");
		expect(savedInstrument.toPrimitives()).toEqual({
			id: "123e4567-e89b-12d3-a456-426614174000",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
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
		expect(instrumentRepositoryGetByIdMock).toHaveBeenCalledWith("catalog-1");
		expect(findByText(view.root, "Guitarra principal")).not.toBeNull();
		expect(findByText(view.root, "Electric Guitar")).not.toBeNull();
		expect(queryInput(view.root, "songInstrumentName-song-1")).toBeNull();

		view.unmount();
	});

	it("assigns a musician by email, closes the modal, and refreshes the row on success", async () => {
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
				instrumentId: "catalog-1",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		instrumentRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "catalog-1",
			name: "Electric Guitar",
			description: "Amplified guitar",
			createdAt: "2026-07-15T09:55:00.000Z",
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		repositoryAssignMusicianMock.mockResolvedValueOnce(undefined);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-1",
			musicianId: "musician-2",
			createdAt: "2026-07-15T10:00:00.000Z",
			video: null,
			upload: null,
		});

		clickButton(findButtonByText(view.root, "Asignar músico"));
		await flushView();

		expect(
			findInput(view.root, "assignMusicianEmail-instrument-1"),
		).not.toBeNull();
		setInputValue(
			findInput(view.root, "assignMusicianEmail-instrument-1"),
			"player@example.com",
		);
		await flushView();
		await submitForm(
			findElement(
				view.root,
				(node) =>
					node.type === "form" && textContent(node).includes("Confirmar"),
			) as TestElementNode,
		);
		await flushView();
		await flushView();

		expect(repositoryAssignMusicianMock).toHaveBeenCalledWith(
			"song-1",
			"instrument-1",
			new MusicianEmail("player@example.com"),
		);
		expect(repositoryGetInstrumentByIdMock).toHaveBeenNthCalledWith(
			1,
			"song-1",
			"instrument-1",
		);
		expect(
			queryInput(view.root, "assignMusicianEmail-instrument-1"),
		).toBeNull();
		expect(findByText(view.root, "musician-2")).not.toBeNull();
		expect(repositorySaveInstrumentMock).not.toHaveBeenCalled();
		expect(repositoryUploadInstrumentVideoMock).not.toHaveBeenCalled();

		view.unmount();
	});

	it("keeps the assign musician modal open and shows the backend error when assignment fails", async () => {
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
				instrumentId: "catalog-1",
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		instrumentRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "catalog-1",
			name: "Electric Guitar",
			description: "Amplified guitar",
			createdAt: "2026-07-15T09:55:00.000Z",
		});
		repositoryAssignMusicianMock.mockRejectedValueOnce({
			response: {
				status: 400,
				data: {
					message: "Invalid email",
				},
			},
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		clickButton(findButtonByText(view.root, "Asignar músico"));
		await flushView();
		setInputValue(
			findInput(view.root, "assignMusicianEmail-instrument-1"),
			"invalid-email",
		);
		await flushView();
		await submitForm(
			findElement(
				view.root,
				(node) =>
					node.type === "form" && textContent(node).includes("Confirmar"),
			) as TestElementNode,
		);
		await flushView();
		await flushView();

		expect(repositoryAssignMusicianMock).not.toHaveBeenCalled();
		expect(
			findInput(view.root, "assignMusicianEmail-instrument-1"),
		).not.toBeNull();
		expect(
			findByText(view.root, "Escribí un email válido para asignar el músico."),
		).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "error",
				message: "Escribí un email válido para asignar el músico.",
			}),
		]);
		expect(repositoryGetInstrumentByIdMock).not.toHaveBeenCalled();

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
		await openUploadModal(view.root);

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

		expect(findByText(view.root, "Video disponible.")).toBeNull();
		expect(
			findByTestId(view.root, "upload-complete-song-1-instrument-1"),
		).not.toBeNull();
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

	it("keeps the upload request spinner only while the upload request itself is in flight", async () => {
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
		const pendingUpload: {
			resolve: (() => void) | undefined;
		} = {
			resolve: undefined,
		};
		repositoryUploadInstrumentVideoMock.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					pendingUpload.resolve = resolve;
				}),
		);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();
		await openUploadModal(view.root);

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});
		setFileInputValue(fileInput, [videoFile]);
		await flushView();

		const submitPromise = submitForm(
			findSongInstrumentForm(view.root, "song-1-instrument-1"),
		);
		await flushView();

		expect(
			findByText(view.root, "Subiendo video al servidor..."),
		).not.toBeNull();

		if (!pendingUpload.resolve) {
			throw new Error("The pending upload promise was not captured.");
		}

		pendingUpload.resolve();
		await submitPromise;
		await flushView();

		expect(findByText(view.root, "Subiendo video al servidor...")).toBeNull();
		expect(
			findByText(view.root, "Subida aceptada. Pendiente de validación."),
		).not.toBeNull();

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
		await openUploadModal(view.root);

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
		expect(
			findByText(view.root, "Subida aceptada. Pendiente de validación."),
		).not.toBeNull();
		expect(findByText(view.root, "Subiendo video al servidor...")).toBeNull();

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		expect(
			findByText(view.root, "Procesando y sincronizando video..."),
		).not.toBeNull();
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
		expect(findByText(view.root, "Video disponible.")).toBeNull();
		expect(
			findByTestId(view.root, "upload-complete-song-1-instrument-1"),
		).not.toBeNull();
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
		await openUploadModal(view.root);

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
		expect(findByText(view.root, "Video disponible.")).toBeNull();
		expect(
			findByTestId(view.root, "upload-complete-song-1-instrument-1"),
		).not.toBeNull();

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
		await openUploadModal(view.root);

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
		await openUploadModal(view.root);

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

	it("shows simulated upload progress during the request and keeps tracking after acceptance", async () => {
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
			},
		]);
		const pendingUpload: {
			resolve: (() => void) | undefined;
		} = {
			resolve: undefined,
		};
		repositoryUploadInstrumentVideoMock.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					pendingUpload.resolve = resolve;
				}),
		);
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
					status: "READY",
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
		await openUploadModal(view.root);

		const fileInput = findInput(
			view.root,
			"songInstrumentVideo-song-1-instrument-1",
		);
		const videoFile = new File(["video-bytes"], "riff.mp4", {
			type: "video/mp4",
		});
		setFileInputValue(fileInput, [videoFile]);
		await flushView();

		const submitPromise = submitForm(
			findSongInstrumentForm(view.root, "song-1-instrument-1"),
		);
		await flushView();

		await vi.advanceTimersByTimeAsync(1500);
		await flushView();

		const requestProgress = findByTestId(
			view.root,
			"upload-progress-song-1-instrument-1",
		);
		expect(Number(requestProgress.props["aria-valuenow"])).toBeGreaterThan(0);
		expect(
			findByText(view.root, "Subiendo video al servidor..."),
		).not.toBeNull();

		if (!pendingUpload.resolve) {
			throw new Error("The pending upload promise was not captured.");
		}

		pendingUpload.resolve();
		await submitPromise;
		await flushView();

		expect(repositoryUploadInstrumentVideoMock).toHaveBeenCalledWith(
			"song-1",
			"instrument-1",
			videoFile,
		);
		expect(
			findByText(view.root, "Subida aceptada. Pendiente de validación."),
		).not.toBeNull();

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();

		const backendProgress = findByTestId(
			view.root,
			"upload-progress-song-1-instrument-1",
		);
		expect(Number(backendProgress.props["aria-valuenow"])).toBeGreaterThan(0);
		expect(Number(backendProgress.props["aria-valuenow"])).toBeLessThan(100);
		expect(
			findByText(view.root, "Video recibido. Validando archivo..."),
		).not.toBeNull();

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();

		expect(findByText(view.root, "Video disponible.")).toBeNull();
		expect(
			queryByTestId(view.root, "upload-progress-song-1-instrument-1"),
		).toBeNull();
		expect(
			findByTestId(view.root, "upload-complete-song-1-instrument-1"),
		).not.toBeNull();
		expect(
			findByTestId(view.root, "upload-complete-song-1-instrument-1"),
		).not.toBeNull();

		view.unmount();
		vi.useRealTimers();
	});

	it("starts polling automatically for loaded instruments with a non-final upload state", async () => {
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
				upload: {
					status: "READY",
				},
			},
		]);
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
		await openUploadModal(view.root);

		expect(
			findByText(view.root, "Video recibido. Validando archivo..."),
		).not.toBeNull();
		expect(
			queryByTestId(view.root, "upload-progress-song-1-instrument-1"),
		).not.toBeNull();

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		expect(repositoryGetInstrumentByIdMock).toHaveBeenNthCalledWith(
			1,
			"song-1",
			"instrument-1",
		);
		expect(
			findByText(view.root, "Procesando y sincronizando video..."),
		).not.toBeNull();

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		expect(findByText(view.root, "Video disponible.")).toBeNull();
		expect(
			queryByTestId(view.root, "upload-progress-song-1-instrument-1"),
		).toBeNull();
		expect(
			findByTestId(view.root, "upload-complete-song-1-instrument-1"),
		).not.toBeNull();
		expect(
			findByTestId(view.root, "upload-complete-song-1-instrument-1"),
		).not.toBeNull();

		view.unmount();
		vi.useRealTimers();
	});

	it("hides the simulated progress bar and keeps the failure copy coherent when backend processing fails", async () => {
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
			},
		]);
		repositoryUploadInstrumentVideoMock.mockResolvedValueOnce(undefined);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentType: "electric-guitar",
			songId: "song-1",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			video: null,
			upload: {
				status: "FAILED",
				errorMessage: "video file exceeds the maximum size",
			},
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();
		await openUploadModal(view.root);

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
		await vi.advanceTimersByTimeAsync(5000);
		await flushView();

		expect(
			queryByTestId(view.root, "upload-progress-song-1-instrument-1"),
		).toBeNull();
		expect(
			findByText(view.root, "El archivo supera el tamaño máximo permitido."),
		).not.toBeNull();
		expect(
			findByText(view.root, "Subida aceptada. Pendiente de validación."),
		).toBeNull();

		view.unmount();
		vi.useRealTimers();
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
		await openUploadModal(view.root);

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

	it("shows the instrument validation error inside the modal when the musician profile is unavailable", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
			},
		]);
		instrumentRepositoryGetAllMock.mockResolvedValueOnce([
			{
				id: "catalog-1",
				name: "Electric Guitar",
				description: "Amplified guitar",
				createdAt: "2026-07-15T09:55:00.000Z",
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
		setSelectValue(
			findSelect(view.root, "songInstrumentId-song-1"),
			"catalog-1",
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
		).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "error",
				message:
					"Debes completar tu perfil de músico para añadir instrumentos.",
			}),
		]);

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
		await openUploadModal(view.root);

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
		await openUploadModal(view.root);

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
		expect(findByText(view.root, "No se pudo crear la canción.")).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "error",
				message: "No se pudo crear la canción.",
			}),
		]);

		view.unmount();
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, nextTick } from "vue";
import { Band } from "@/domain/band/Band.js";
import { MusicianEmail } from "@/domain/musician/value-object/MusicianEmail.js";
import { MusicianId } from "@/domain/musician/value-object/MusicianId.js";
import type { Song } from "@/domain/song/Song.js";
import type { SongInstrument } from "@/domain/song/SongInstrument.js";
import { SongId } from "@/domain/song/value-object/SongId.js";
import { SongInstrumentId } from "@/domain/song/value-object/SongInstrumentId.js";
import { SongInstrumentVideoFile } from "@/domain/song/value-object/SongInstrumentVideoFile.js";

const addInstrumentsProfileMessage = `Debes completar tu perfil de músico para añadir ${"instrument"}os.`;

const {
	sessionStorage,
	routerPushMock,
	repositorySaveMock,
	repositoryGetByBandIdMock,
	repositorySaveInstrumentMock,
	repositoryGetInstrumentsBySongIdMock,
	repositoryGetInstrumentByIdMock,
	repositoryUpdateInstrumentMock,
	repositoryAssignMusicianMock,
	repositoryInviteMusicianMock,
	repositoryUploadInstrumentVideoMock,
	bandRepositoryGetMembersMock,
	instrumentRepositoryGetAllMock,
	instrumentRepositoryGetByIdMock,
	musicianRepositoryGetByIdMock,
	bootstrapTooltipCtor,
	bootstrapTooltipDisposeMock,
	repositoryCtor,
	bandRepositoryCtor,
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
	routerPushMock: vi.fn<(location: unknown) => Promise<void>>(),
	repositorySaveMock: vi.fn<(bandId: string, song: Song) => Promise<void>>(),
	repositoryGetByBandIdMock: vi.fn<(bandId: string) => Promise<unknown[]>>(),
	repositorySaveInstrumentMock:
		vi.fn<(songId: SongId, instrument: SongInstrument) => Promise<void>>(),
	repositoryGetInstrumentsBySongIdMock:
		vi.fn<(songId: SongId) => Promise<unknown[]>>(),
	repositoryGetInstrumentByIdMock:
		vi.fn<
			(songId: SongId, instrumentId: SongInstrumentId) => Promise<unknown>
		>(),
	repositoryUpdateInstrumentMock:
		vi.fn<
			(
				songId: SongId,
				instrumentId: SongInstrumentId,
				payload: { name: string; instrumentId: string },
			) => Promise<unknown>
		>(),
	repositoryAssignMusicianMock:
		vi.fn<
			(
				songId: SongId,
				instrumentId: SongInstrumentId,
				musicianId: MusicianId,
			) => Promise<void>
		>(),
	repositoryInviteMusicianMock:
		vi.fn<
			(
				songId: SongId,
				instrumentId: SongInstrumentId,
				musicianEmail: MusicianEmail,
			) => Promise<void>
		>(),
	repositoryUploadInstrumentVideoMock:
		vi.fn<
			(
				songId: SongId,
				instrumentId: SongInstrumentId,
				videoFile: SongInstrumentVideoFile,
			) => Promise<void>
		>(),
	bandRepositoryGetMembersMock: vi.fn<(bandId: string) => Promise<unknown[]>>(),
	instrumentRepositoryGetAllMock: vi.fn<() => Promise<unknown[]>>(),
	instrumentRepositoryGetByIdMock:
		vi.fn<(instrumentId: string) => Promise<unknown>>(),
	musicianRepositoryGetByIdMock:
		vi.fn<(musicianId: string) => Promise<unknown>>(),
	bootstrapTooltipCtor: vi.fn<(element: unknown) => void>(),
	bootstrapTooltipDisposeMock: vi.fn<() => void>(),
	repositoryCtor: vi.fn(),
	bandRepositoryCtor: vi.fn(),
	instrumentRepositoryCtor: vi.fn(),
	musicianRepositoryCtor: vi.fn(),
}));

vi.mock("../../../infrastructure/storage/browserSessionStorage.js", () => ({
	browserSessionStorage: sessionStorage,
}));

vi.mock("vue-router", () => ({
	useRouter: () => ({
		push: routerPushMock,
	}),
}));

vi.mock("../../../infrastructure/song/AxiosSongRepository.js", () => ({
	AxiosSongRepository: class {
		constructor() {
			repositoryCtor();
		}

		async save(bandId: string, song: unknown): Promise<void> {
			return repositorySaveMock(bandId, song as Song);
		}

		getByBandId(bandId: string): Promise<unknown[]> {
			return repositoryGetByBandIdMock(bandId);
		}

		async saveInstrument(songId: SongId, instrument: unknown): Promise<void> {
			return repositorySaveInstrumentMock(songId, instrument as SongInstrument);
		}

		getInstrumentsBySongId(songId: SongId): Promise<unknown[]> {
			return repositoryGetInstrumentsBySongIdMock(songId);
		}

		getInstrumentById(
			songId: SongId,
			instrumentId: SongInstrumentId,
		): Promise<unknown> {
			return repositoryGetInstrumentByIdMock(songId, instrumentId);
		}

		updateInstrument(
			songId: SongId,
			instrumentId: SongInstrumentId,
			payload: { name: string; instrumentId: string },
		): Promise<unknown> {
			return repositoryUpdateInstrumentMock(songId, instrumentId, payload);
		}

		assignMusician(
			songId: SongId,
			instrumentId: SongInstrumentId,
			musicianId: MusicianId,
		): Promise<void> {
			return repositoryAssignMusicianMock(songId, instrumentId, musicianId);
		}

		inviteMusician(
			songId: SongId,
			instrumentId: SongInstrumentId,
			musicianEmail: MusicianEmail,
		): Promise<void> {
			return repositoryInviteMusicianMock(songId, instrumentId, musicianEmail);
		}

		uploadInstrumentVideo(
			songId: SongId,
			instrumentId: SongInstrumentId,
			videoFile: SongInstrumentVideoFile,
		): Promise<void> {
			return repositoryUploadInstrumentVideoMock(
				songId,
				instrumentId,
				videoFile,
			);
		}
	},
}));

vi.mock("../../../infrastructure/band/AxiosBandRepository.js", () => ({
	AxiosBandRepository: class {
		constructor() {
			bandRepositoryCtor();
		}

		getMembers(bandId: string): Promise<unknown[]> {
			return bandRepositoryGetMembersMock(bandId);
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

			getAll(): Promise<unknown[]> {
				return instrumentRepositoryGetAllMock();
			}

			getById(instrumentId: string): Promise<unknown> {
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

		getById(musicianId: string): Promise<unknown> {
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

import SongsView from "./SongsView.vue";
import { i18n } from "../../../infrastructure/config/i18n.js";
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
	app.use(i18n);
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

function findButtonByLabel(
	root: TestElementNode,
	label: string,
): TestElementNode {
	const button = findElement(
		root,
		(node) =>
			node.type === "button" &&
			(node.props["aria-label"] === label || node.props.title === label),
	);

	if (!button) {
		throw new Error(`Button with label '${label}' was not found.`);
	}

	return button;
}

function findTooltipTargetByLabel(
	root: TestElementNode,
	label: string,
): TestElementNode {
	const target = findElement(
		root,
		(node) =>
			node.props["data-bs-toggle"] === "tooltip" &&
			(node.props["data-bs-title"] === label || node.props.title === label),
	);

	if (!target) {
		throw new Error(`Tooltip target with label '${label}' was not found.`);
	}

	return target;
}

function queryLinkByLabel(
	root: TestElementNode,
	label: string,
): TestElementNode | null {
	return findElement(
		root,
		(node) =>
			node.type === "a" &&
			(node.props["aria-label"] === label ||
				node.props.title === label ||
				node.props["data-bs-title"] === label),
	);
}

function findLinkByLabel(
	root: TestElementNode,
	label: string,
): TestElementNode {
	const link = queryLinkByLabel(root, label);

	if (!link) {
		throw new Error(`Link with label '${label}' was not found.`);
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
	clickButton(findButtonByLabel(root, "Subir vídeo"));
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
	const onChange = select.props.onChange;
	if (typeof onChange === "function") {
		onChange({ target: select });
		return;
	}
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
		routerPushMock.mockReset();
		repositorySaveMock.mockReset();
		repositoryGetByBandIdMock.mockReset();
		repositoryGetByBandIdMock.mockResolvedValue([]);
		repositorySaveInstrumentMock.mockReset();
		repositoryGetInstrumentsBySongIdMock.mockReset();
		repositoryGetInstrumentsBySongIdMock.mockResolvedValue([]);
		repositoryGetInstrumentByIdMock.mockReset();
		repositoryUpdateInstrumentMock.mockReset();
		repositoryAssignMusicianMock.mockReset();
		repositoryInviteMusicianMock.mockReset();
		repositoryUploadInstrumentVideoMock.mockReset();
		bandRepositoryGetMembersMock.mockReset();
		bandRepositoryGetMembersMock.mockResolvedValue([]);
		instrumentRepositoryGetAllMock.mockReset();
		instrumentRepositoryGetAllMock.mockResolvedValue([]);
		instrumentRepositoryGetByIdMock.mockReset();
		musicianRepositoryGetByIdMock.mockReset();
		repositoryCtor.mockReset();
		bandRepositoryCtor.mockReset();
		instrumentRepositoryCtor.mockReset();
		musicianRepositoryCtor.mockReset();
		bootstrapTooltipCtor.mockReset();
		bootstrapTooltipDisposeMock.mockReset();
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

	it("opens the track editor route for a song from the songs list and exposes a stable anchor target", async () => {
		repositoryGetByBandIdMock.mockResolvedValueOnce([
			{
				id: "song-1",
				bandId: "band-1",
				title: "Paint It Black",
				originalVideoclipUrl: "https://www.youtube.com/watch?v=O4irXQhgMqg",
				originalVideoClipDurationSeconds: 187,
			},
		]);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		clickButton(findButtonByText(view.root, "Editar pistas"));

		expect(routerPushMock).toHaveBeenCalledWith({
			name: "SongTrackEditor",
			params: { songId: "song-1" },
			query: {
				title: "Paint It Black",
				originalVideoClipDurationSeconds: "187",
			},
		});
		expect(findSongArticle(view.root, "Paint It Black").props.id).toBe(
			"song-1",
		);

		view.unmount();
	});

	it("renders each song instruments inside a table with icon actions and status pills", async () => {
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
		expect(bootstrapTooltipCtor).toHaveBeenCalledTimes(3);
		expect(findTooltipTargetByLabel(view.root, "Editar").type).toBe("span");
		expect(findTooltipTargetByLabel(view.root, "Editar").props.tabindex).toBe(
			"0",
		);
		expect(findTooltipTargetByLabel(view.root, "Subir vídeo").type).toBe(
			"button",
		);
		expect(findTooltipTargetByLabel(view.root, "Asignar músico").type).toBe(
			"button",
		);
		expect(
			String(findTooltipTargetByLabel(view.root, "Subir vídeo").props.class),
		).toContain("song-instrument-action");
		expect(
			String(findTooltipTargetByLabel(view.root, "Asignar músico").props.class),
		).toContain("song-instrument-action");
		expect(
			String(findTooltipTargetByLabel(view.root, "Editar").props.class),
		).toContain("song-instrument-action-wrapper");
		expect(
			String(findButtonByLabel(view.root, "Editar").props.class),
		).toContain("px-2");
		expect(
			String(findButtonByLabel(view.root, "Editar").props.class),
		).toContain("rounded-2");
		expect(
			findElement(
				findButtonByLabel(view.root, "Editar"),
				(node) =>
					node.type === "i" && String(node.props.class).includes("bi-pencil"),
			),
		).not.toBeNull();
		expect(
			findElement(
				findButtonByLabel(view.root, "Subir vídeo"),
				(node) =>
					node.type === "i" && String(node.props.class).includes("bi-upload"),
			),
		).not.toBeNull();
		expect(
			findElement(
				findButtonByLabel(view.root, "Asignar músico"),
				(node) =>
					node.type === "i" && String(node.props.class).includes("bi-person"),
			),
		).not.toBeNull();
		expect(
			String(
				findElement(
					view.root,
					(node) =>
						node.type === "div" &&
						String(node.props.class).includes("song-instrument-actions"),
				)?.props.class,
			),
		).toContain("song-instrument-actions");
		expect(textContent(table as TestElementNode)).toContain(
			"Título de la pista",
		);
		expect(textContent(table as TestElementNode)).toContain("Instrumento");
		expect(textContent(table as TestElementNode)).toContain("Músico");
		expect(textContent(table as TestElementNode)).toContain("Estado");
		expect(textContent(table as TestElementNode)).toContain("Acciones");
		expect(textContent(table as TestElementNode)).toContain("#1");
		expect(textContent(table as TestElementNode)).toContain(
			"Guitarra principal",
		);
		expect(textContent(table as TestElementNode)).toContain("Electric Guitar");
		expect(textContent(table as TestElementNode)).toContain("Keith Richards");
		expect(textContent(table as TestElementNode)).not.toContain("musician-1");
		expect(findButtonByLabel(view.root, "Editar").disabled).toBe(false);
		expect(findButtonByLabel(view.root, "Subir vídeo")).not.toBeNull();
		expect(findButtonByLabel(view.root, "Asignar músico")).not.toBeNull();
		expect(textContent(table as TestElementNode)).not.toContain("Ver video");
		expect(findByText(view.root, "Pendiente")).not.toBeNull();
		expect(findByText(view.root, "Disponible")).toBeNull();
		expect(queryLinkByLabel(view.root, "Ver video")).toBeNull();
		expect(findByText(view.root, "Ver en YouTube")).not.toBeNull();

		view.unmount();
	});

	it("opens the edit modal using the current song instrument row even when the catalog id is missing", async () => {
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
				songId: "song-1",
				musicianId: "musician-1",
				createdAt: "2026-07-15T10:00:00.000Z",
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-1",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			video: null,
			upload: null,
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		expect(findButtonByLabel(view.root, "Editar").disabled).toBe(false);
		clickButton(findButtonByLabel(view.root, "Editar"));
		await flushView();
		await flushView();

		expect(repositoryGetInstrumentByIdMock).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
		);
		expect(
			findByText(view.root, "Editar instrumento · Guitarra principal"),
		).not.toBeNull();
		expect(findInput(view.root, "editInstrumentName-instrument-1").value).toBe(
			"Guitarra principal",
		);
		expect(
			findSelect(view.root, "editInstrumentCatalogId-instrument-1").value,
		).toBe("catalog-1");

		view.unmount();
	});

	it("opens the edit modal with the song instrument detail and updates the table after saving", async () => {
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
				upload: null,
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
		instrumentRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "catalog-1",
			name: "Electric Guitar",
			description: "Amplified guitar",
			createdAt: "2026-07-15T09:55:00.000Z",
		});
		repositoryUpdateInstrumentMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra eléctrica",
			instrumentId: "catalog-2",
			songId: "song-1",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			video: null,
			upload: null,
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		clickButton(findButtonByLabel(view.root, "Editar"));
		await flushView();
		await flushView();

		expect(
			findByText(view.root, "Editar instrumento · Guitarra principal"),
		).not.toBeNull();
		expect(instrumentRepositoryGetByIdMock).toHaveBeenCalledTimes(1);
		expect(instrumentRepositoryGetByIdMock).toHaveBeenLastCalledWith(
			"catalog-1",
		);
		const nameInput = findInput(view.root, "editInstrumentName-instrument-1");
		const instrumentSelect = findSelect(
			view.root,
			"editInstrumentCatalogId-instrument-1",
		);
		expect(nameInput.value).toBe("Guitarra principal");
		expect(instrumentSelect.value).toBe("catalog-1");
		expect(textContent(instrumentSelect)).toContain("Electric Guitar");

		setInputValue(nameInput, "Guitarra eléctrica");
		setSelectValue(instrumentSelect, "catalog-2");
		await flushView();

		await submitForm(findSongInstrumentForm(view.root, "edit-instrument-1"));
		await flushView();
		await flushView();

		expect(repositoryUpdateInstrumentMock).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			{
				name: "Guitarra eléctrica",
				instrumentId: "catalog-2",
			},
		);
		expect(findByText(view.root, "Guitarra eléctrica")).not.toBeNull();
		expect(findByText(view.root, "Drums")).not.toBeNull();
		expect(queryInput(view.root, "editInstrumentName-instrument-1")).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "success",
				message: "Instrumento actualizado correctamente.",
			}),
		]);

		view.unmount();
	});

	it("disposes the action tooltips when the view unmounts", async () => {
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
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		view.unmount();

		expect(bootstrapTooltipDisposeMock).toHaveBeenCalled();
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
			new SongId("song-1"),
		);
		expect(repositoryGetInstrumentsBySongIdMock).toHaveBeenNthCalledWith(
			2,
			new SongId("song-2"),
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
		expect(findByText(view.root, "Título de la pista")).not.toBeNull();
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
		expect(savedSongId).toEqual(new SongId("song-1"));
		expect(savedInstrument.toPrimitives()).toEqual({
			id: "123e4567-e89b-12d3-a456-426614174000",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			musicianId: "musician-1",
		});
		expect(repositoryGetInstrumentsBySongIdMock).toHaveBeenNthCalledWith(
			1,
			new SongId("song-1"),
		);
		expect(repositoryGetInstrumentsBySongIdMock).toHaveBeenNthCalledWith(
			2,
			new SongId("song-1"),
		);
		expect(instrumentRepositoryGetByIdMock).toHaveBeenCalledWith("catalog-1");
		expect(findByText(view.root, "Guitarra principal")).not.toBeNull();
		expect(findByText(view.root, "Electric Guitar")).not.toBeNull();
		expect(queryInput(view.root, "songInstrumentName-song-1")).toBeNull();

		view.unmount();
	});

	it("invites a musician by email from the assignment modal while keeping the member list active", async () => {
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
		bandRepositoryGetMembersMock.mockResolvedValueOnce([
			{ musicianId: "musician-2", role: "MEMBER" },
		]);
		musicianRepositoryGetByIdMock.mockImplementation(
			async (musicianId: string) => ({
				id: musicianId,
				name: musicianId === "musician-2" ? "Keith Richards" : "Mick Jagger",
				username: musicianId === "musician-2" ? "keith" : "mick",
			}),
		);
		repositoryInviteMusicianMock.mockResolvedValueOnce(undefined);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
			id: "instrument-1",
			name: "Guitarra principal",
			instrumentId: "catalog-1",
			songId: "song-1",
			musicianId: "musician-1",
			createdAt: "2026-07-15T10:00:00.000Z",
			video: null,
			upload: null,
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		clickButton(findButtonByLabel(view.root, "Asignar músico"));
		await flushView();
		await flushView();

		const inviteEmailInput = findInput(
			view.root,
			"assignMusicianEmail-instrument-1",
		);
		setInputValue(inviteEmailInput, "player@example.com");
		await flushView();

		const confirmButton = findButtonByText(view.root, "Invitar por email");
		expect(inviteEmailInput).not.toBeNull();
		expect(confirmButton.disabled).toBe(false);
		expect(findByText(view.root, "Keith Richards")).not.toBeNull();
		expect(findByText(view.root, "@keith")).not.toBeNull();

		await submitForm(
			findElement(
				view.root,
				(node) =>
					node.type === "form" &&
					node.props["aria-label"] === "Invitar músico por email",
			) as TestElementNode,
		);
		await flushView();
		await flushView();

		expect(repositoryInviteMusicianMock).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			new MusicianEmail("player@example.com"),
		);
		expect(repositoryAssignMusicianMock).not.toHaveBeenCalled();
		expect(repositoryGetInstrumentByIdMock).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
		);
		expect(
			queryInput(view.root, "assignMusicianEmail-instrument-1"),
		).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "success",
				message: "Invitación enviada correctamente.",
			}),
		]);

		view.unmount();
	});

	it("lists current band members in the assign musician modal and assigns the selected member by musician id", async () => {
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
		bandRepositoryGetMembersMock.mockResolvedValueOnce([
			{ musicianId: "musician-2", role: "MEMBER" },
		]);
		musicianRepositoryGetByIdMock.mockImplementation(
			async (musicianId: string) => ({
				id: musicianId,
				name: musicianId === "musician-2" ? "Keith Richards" : "Mick Jagger",
				username: musicianId === "musician-2" ? "keith" : "mick",
			}),
		);
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
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		clickButton(findButtonByLabel(view.root, "Asignar músico"));
		await flushView();
		await flushView();

		expect(
			findInput(view.root, "assignMusicianEmail-instrument-1"),
		).not.toBeNull();
		expect(findByText(view.root, "Keith Richards")).not.toBeNull();
		expect(findByText(view.root, "@keith")).not.toBeNull();

		clickButton(
			findElement(
				view.root,
				(node) =>
					node.type === "button" &&
					node.props["aria-label"] === "Seleccionar a Keith Richards",
			) as TestElementNode,
		);
		await flushView();
		await flushView();

		expect(bandRepositoryGetMembersMock).toHaveBeenCalledWith("band-1");
		expect(repositoryAssignMusicianMock).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			new MusicianId("musician-2"),
		);
		expect(
			queryInput(view.root, "assignMusicianEmail-instrument-1"),
		).toBeNull();
		expect(findByText(view.root, "Keith Richards")).not.toBeNull();

		view.unmount();
	});

	it("shows band members even when their profile has no email because selection no longer depends on email", async () => {
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
		bandRepositoryGetMembersMock.mockResolvedValueOnce([
			{ musicianId: "musician-2", role: "MEMBER" },
		]);
		musicianRepositoryGetByIdMock.mockImplementation(
			async (musicianId: string) => ({
				id: musicianId,
				name: musicianId === "musician-2" ? "Charlie Watts" : "Mick Jagger",
				username: musicianId === "musician-2" ? "charlie" : "mick",
			}),
		);
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		clickButton(findButtonByLabel(view.root, "Asignar músico"));
		await flushView();
		await flushView();

		expect(findByText(view.root, "Charlie Watts")).not.toBeNull();
		expect(findByText(view.root, "@charlie")).not.toBeNull();
		expect(
			findByText(view.root, "No hay miembros disponibles para seleccionar."),
		).toBeNull();
		expect(repositoryAssignMusicianMock).not.toHaveBeenCalled();
		expect(
			findInput(view.root, "assignMusicianEmail-instrument-1"),
		).not.toBeNull();

		view.unmount();
	});

	it("keeps the assign musician modal open and shows the backend error when member assignment fails", async () => {
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
		bandRepositoryGetMembersMock.mockResolvedValueOnce([
			{ musicianId: "musician-2", role: "MEMBER" },
		]);
		musicianRepositoryGetByIdMock.mockImplementation(
			async (musicianId: string) => ({
				id: musicianId,
				name: musicianId === "musician-2" ? "Charlie Watts" : "Mick Jagger",
				username: musicianId === "musician-2" ? "charlie" : "mick",
			}),
		);
		repositoryAssignMusicianMock.mockRejectedValueOnce({
			response: {
				status: 403,
			},
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		clickButton(findButtonByLabel(view.root, "Asignar músico"));
		await flushView();
		await flushView();
		clickButton(
			findElement(
				view.root,
				(node) =>
					node.type === "button" &&
					node.props["aria-label"] === "Seleccionar a Charlie Watts",
			) as TestElementNode,
		);
		await flushView();
		await flushView();

		expect(repositoryAssignMusicianMock).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			new MusicianId("musician-2"),
		);
		expect(
			findInput(view.root, "assignMusicianEmail-instrument-1"),
		).not.toBeNull();
		expect(
			findByText(
				view.root,
				"No tienes permisos para asignar músicos a este instrumento.",
			),
		).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "error",
				message: "No tienes permisos para asignar músicos a este instrumento.",
			}),
		]);
		expect(repositoryGetInstrumentByIdMock).not.toHaveBeenCalled();

		view.unmount();
	});

	it("keeps the assign musician modal open and shows the backend error when the email invite fails", async () => {
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
		bandRepositoryGetMembersMock.mockResolvedValueOnce([
			{ musicianId: "musician-2", role: "MEMBER" },
		]);
		musicianRepositoryGetByIdMock.mockImplementation(
			async (musicianId: string) => ({
				id: musicianId,
				name: musicianId === "musician-2" ? "Charlie Watts" : "Mick Jagger",
				username: musicianId === "musician-2" ? "charlie" : "mick",
			}),
		);
		repositoryInviteMusicianMock.mockRejectedValueOnce({
			response: {
				status: 403,
			},
		});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
		await flushView();

		clickButton(findButtonByLabel(view.root, "Asignar músico"));
		await flushView();
		await flushView();
		setInputValue(
			findInput(view.root, "assignMusicianEmail-instrument-1"),
			"player@example.com",
		);
		await flushView();

		await submitForm(
			findElement(
				view.root,
				(node) =>
					node.type === "form" &&
					node.props["aria-label"] === "Invitar músico por email",
			) as TestElementNode,
		);
		await flushView();
		await flushView();

		expect(repositoryInviteMusicianMock).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			new MusicianEmail("player@example.com"),
		);
		expect(
			findInput(view.root, "assignMusicianEmail-instrument-1"),
		).not.toBeNull();
		expect(findByText(view.root, "Charlie Watts")).not.toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "error",
				message: "No tienes permisos para invitar músicos a este instrumento.",
			}),
		]);
		expect(repositoryGetInstrumentByIdMock).not.toHaveBeenCalled();

		view.unmount();
	});

	it("keeps the upload input available when opening the modal for an instrument that already has a video", async () => {
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
					status: "COMPLETED",
				},
			},
		]);
		repositoryGetInstrumentByIdMock.mockResolvedValueOnce({
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
		await flushView();
		await openUploadModal(view.root);

		expect(findByText(view.root, "Disponible")).not.toBeNull();
		expect(
			queryInput(view.root, "songInstrumentVideo-song-1-instrument-1"),
		).not.toBeNull();
		expect(findButtonByText(view.root, "Resubir video")).not.toBeNull();
		expect(textContent(view.root)).not.toContain("Ver video");

		const viewVideoLink = findLinkByLabel(view.root, "Ver video");
		expect(viewVideoLink.type).toBe("a");
		expect(viewVideoLink.props.href).toBe("https://cdn.example/video-1.mp4");
		expect(viewVideoLink.props.target).toBe("_blank");
		expect(viewVideoLink.props.rel).toBe("noreferrer noopener");

		view.unmount();
	});

	it("closes the modal after accepting a reupload and switches the table pill away from disponible", async () => {
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
					status: "COMPLETED",
				},
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
					status: "PROCESSING",
				},
			});
		const view = renderSongsView(() => {
			const store = useBandStore();
			store.setBands([createBand("band-1", "The Stones")]);
		});

		await flushView();
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

		expect(
			queryByTestId(view.root, "upload-progress-song-1-instrument-1"),
		).not.toBeNull();
		expect(
			findByText(view.root, "Subiendo video al servidor..."),
		).not.toBeNull();

		if (!pendingUpload.resolve) {
			throw new Error("The pending upload promise was not captured.");
		}

		pendingUpload.resolve();
		await submitPromise;
		await flushView();

		expect(
			querySongInstrumentForm(view.root, "song-1-instrument-1"),
		).toBeNull();
		const songArticle = findSongArticle(view.root, "Paint It Black");
		expect(textContent(songArticle)).not.toContain("Disponible");
		expect(textContent(songArticle)).toContain("Pendiente de validación");

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();

		expect(textContent(songArticle)).toContain("Procesando");

		view.unmount();
		vi.useRealTimers();
	});

	it("closes the upload modal right after the upload request is accepted and moves the waiting state to the row pill", async () => {
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

		expect(
			querySongInstrumentForm(view.root, "song-1-instrument-1"),
		).toBeNull();
		expect(
			findByText(view.root, "Subida aceptada. Pendiente de validación."),
		).toBeNull();
		const songArticle = findSongArticle(view.root, "Paint It Black");
		expect(
			findElement(
				songArticle,
				(node) =>
					node.props["data-testid"] === "upload-progress-song-1-instrument-1",
			),
		).toBeNull();
		expect(textContent(songArticle)).toContain("Pendiente de validación");
		expect(textContent(songArticle)).not.toContain(
			"Subiendo video al servidor...",
		);
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
		expect(
			querySongInstrumentForm(view.root, "song-1-instrument-1"),
		).toBeNull();
		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		await vi.advanceTimersByTimeAsync(5000);
		await flushView();

		expect(findByText(view.root, "Video disponible.")).toBeNull();
		expect(
			findByTestId(view.root, "upload-complete-song-1-instrument-1"),
		).not.toBeNull();
		expect(
			querySongInstrumentForm(view.root, "song-1-instrument-1"),
		).toBeNull();
		expect(textContent(view.root)).not.toContain("Resubir video");
		expect(textContent(view.root)).not.toContain("Ver video");

		const viewVideoLink = findLinkByLabel(view.root, "Ver video");
		expect(viewVideoLink.type).toBe("a");
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
			querySongInstrumentForm(view.root, "song-1-instrument-1"),
		).toBeNull();
		const songArticle = findSongArticle(view.root, "Paint It Black");
		expect(textContent(songArticle)).toContain("Pendiente de validación");

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
			querySongInstrumentForm(view.root, "song-1-instrument-1"),
		).toBeNull();
		const songArticle = findSongArticle(view.root, "Paint It Black");
		expect(textContent(songArticle)).toContain("Pendiente de validación");
		expect(findByText(view.root, "Subiendo video al servidor...")).toBeNull();

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		expect(textContent(songArticle)).toContain("Procesando");
		expect(repositoryGetInstrumentByIdMock).toHaveBeenNthCalledWith(
			1,
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
		);

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();
		expect(repositoryGetInstrumentByIdMock).toHaveBeenNthCalledWith(
			2,
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
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
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
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
		const songArticle = findSongArticle(view.root, "Paint It Black");
		expect(
			findElement(
				songArticle,
				(node) =>
					node.props["data-testid"] === "upload-progress-song-1-instrument-1",
			),
		).toBeNull();
		expect(textContent(songArticle)).not.toContain(
			"Subiendo video al servidor...",
		);

		if (!pendingUpload.resolve) {
			throw new Error("The pending upload promise was not captured.");
		}

		pendingUpload.resolve();
		await submitPromise;
		await flushView();

		expect(repositoryUploadInstrumentVideoMock).toHaveBeenCalledWith(
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
			new SongInstrumentVideoFile(videoFile),
		);
		expect(
			querySongInstrumentForm(view.root, "song-1-instrument-1"),
		).toBeNull();
		expect(textContent(songArticle)).toContain("Pendiente de validación");

		await vi.advanceTimersByTimeAsync(5000);
		await flushView();

		expect(
			queryByTestId(view.root, "upload-progress-song-1-instrument-1"),
		).toBeNull();
		expect(textContent(songArticle)).toContain("Validando archivo");
		expect(
			findElement(
				songArticle,
				(node) =>
					node.props["data-testid"] === "upload-progress-song-1-instrument-1",
			),
		).toBeNull();
		expect(textContent(songArticle)).not.toContain(
			"Video recibido. Validando archivo...",
		);

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
			new SongId("song-1"),
			new SongInstrumentId("instrument-1"),
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
		expect(findByText(view.root, addInstrumentsProfileMessage)).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "error",
				message: addInstrumentsProfileMessage,
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

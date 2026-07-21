import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, nextTick } from "vue";

const {
	sessionStorage,
	repositoryGetMembersMock,
	repositoryAddMemberMock,
	musicianRepositoryGetByIdMock,
	repositoryCtor,
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
	repositoryGetMembersMock:
		vi.fn<
			(
				bandId: string,
			) => Promise<Array<{ musicianId: string; role: "ADMIN" | "MEMBER" }>>
		>(),
	repositoryAddMemberMock:
		vi.fn<(bandId: string, musicianEmail: string) => Promise<void>>(),
	musicianRepositoryGetByIdMock:
		vi.fn<
			(
				musicianId: string,
			) => Promise<{ id: string; name: string; username: string } | null>
		>(),
	repositoryCtor: vi.fn(),
	musicianRepositoryCtor: vi.fn(),
}));

vi.mock("../../../infrastructure/storage/browserSessionStorage.js", () => ({
	browserSessionStorage: sessionStorage,
}));

vi.mock("../../../infrastructure/band/AxiosBandRepository.js", () => ({
	AxiosBandRepository: class {
		constructor() {
			repositoryCtor();
		}

		async getMembers(
			bandId: string,
		): Promise<Array<{ musicianId: string; role: "ADMIN" | "MEMBER" }>> {
			return repositoryGetMembersMock(bandId);
		}

		async addMember(bandId: string, musicianEmail: string): Promise<void> {
			return repositoryAddMemberMock(bandId, musicianEmail);
		}

		async getAll(): Promise<never[]> {
			return [];
		}

		async getById(): Promise<null> {
			return null;
		}

		async save(): Promise<void> {
			return;
		}
	},
}));

vi.mock("../../../infrastructure/musician/AxiosMusicianRepository.js", () => ({
	AxiosMusicianRepository: class {
		constructor() {
			musicianRepositoryCtor();
		}

		async getById(
			musicianId: string,
		): Promise<{ id: string; name: string; username: string } | null> {
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

import MembersView from "./MembersView.vue";
import { MusicianEmail } from "../../../domain/musician/value-object/MusicianEmail.js";
import { useBandStore } from "../../stores/useBandStore.js";
import { useToastStore } from "../../stores/useToastStore.js";

type TestTextNode = {
	type: "text" | "comment" | "static";
	text: string;
	parent: TestElementNode | null;
};

type TestEvent = {
	type: string;
	target?: unknown;
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
				(this.listeners[eventType] ??= []).push(listener);
			},
			removeEventListener(eventType, listener) {
				this.listeners[eventType] = (this.listeners[eventType] ?? []).filter(
					(candidate) => candidate !== listener,
				);
			},
			dispatchEvent(event) {
				for (const listener of this.listeners[event.type] ?? []) {
					listener(event);
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

function renderMembersView(setup?: () => void) {
	const pinia = createPinia();
	setActivePinia(pinia);
	setup?.();
	const root = createRootNode();
	const app = renderer.createApp(MembersView);
	app.use(pinia);
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
	root: TestElementNode,
	predicate: (node: TestElementNode) => boolean,
): TestElementNode | null {
	if (predicate(root)) {
		return root;
	}

	for (const child of root.children) {
		if (!isElementNode(child)) {
			continue;
		}

		const match = findElement(child, predicate);
		if (match) {
			return match;
		}
	}

	return null;
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

function findButtonByText(
	root: TestElementNode,
	label: string,
): TestElementNode {
	const button = findElement(
		root,
		(node) => node.type === "button" && textContent(node).includes(label),
	);

	if (!button) {
		throw new Error(`Button with text '${label}' was not found.`);
	}

	return button;
}

function clickButton(button: TestElementNode): void {
	const onClick = button.props.onClick;
	if (typeof onClick !== "function") {
		throw new Error("Click handler was not found.");
	}

	onClick({ preventDefault() {} });
}

function setInputValue(input: TestElementNode, value: string): void {
	input.value = value;
	const onInput = input.props.onInput;
	if (typeof onInput === "function") {
		onInput({ target: input });
		return;
	}

	input.dispatchEvent({ type: "input", target: input });
}

async function submitForm(form: TestElementNode): Promise<void> {
	const onSubmit = form.props.onSubmit;
	if (typeof onSubmit !== "function") {
		throw new Error("Submit handler was not found.");
	}

	await onSubmit({ preventDefault() {} });
}

async function flushView(): Promise<void> {
	for (let index = 0; index < 8; index += 1) {
		await Promise.resolve();
		await nextTick();
	}
}

describe("MembersView", () => {
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
		repositoryGetMembersMock.mockReset();
		repositoryGetMembersMock.mockResolvedValue([]);
		repositoryAddMemberMock.mockReset();
		musicianRepositoryGetByIdMock.mockReset();
		useToastStore().clear();
		repositoryCtor.mockReset();
		musicianRepositoryCtor.mockReset();
	});

	it("loads and renders the selected band members with their role and username", async () => {
		repositoryGetMembersMock.mockResolvedValueOnce([
			{ musicianId: "musician-1", role: "ADMIN" },
			{ musicianId: "musician-2", role: "MEMBER" },
		]);
		musicianRepositoryGetByIdMock
			.mockResolvedValueOnce({
				id: "musician-1",
				name: "John Frusciante",
				username: "johnny",
			})
			.mockResolvedValueOnce({
				id: "musician-2",
				name: "Flea",
				username: "flea",
			});
		const view = renderMembersView(() => {
			const store = useBandStore();
			store.selectBand("band-1");
		});

		await flushView();
		await flushView();

		expect(repositoryGetMembersMock).toHaveBeenCalledWith("band-1");
		expect(musicianRepositoryGetByIdMock).toHaveBeenNthCalledWith(
			1,
			"musician-1",
		);
		expect(musicianRepositoryGetByIdMock).toHaveBeenNthCalledWith(
			2,
			"musician-2",
		);
		expect(queryByTestId(view.root, "members-empty-state")).toBeNull();
		expect(findByTestId(view.root, "members-grid")).not.toBeNull();
		expect(textContent(view.root)).toContain("Equipo actual");
		expect(textContent(view.root)).toContain("2 miembros");
		expect(textContent(view.root)).toContain("John Frusciante");
		expect(textContent(view.root)).toContain("JF");
		expect(textContent(view.root)).toContain("@johnny");
		expect(textContent(view.root)).toContain("Perfil de músico");
		expect(textContent(view.root)).toContain("Admin");
		expect(textContent(view.root)).toContain("Flea");
		expect(textContent(view.root)).toContain("@flea");
		expect(textContent(view.root)).toContain("Miembro");
		view.unmount();
	});

	it("shows a polished empty state with an inline add-member action", async () => {
		const view = renderMembersView(() => {
			const store = useBandStore();
			store.selectBand("band-empty");
		});

		await flushView();

		expect(repositoryGetMembersMock).toHaveBeenCalledWith("band-empty");
		expect(findByTestId(view.root, "members-empty-state")).not.toBeNull();
		expect(queryByTestId(view.root, "members-grid")).toBeNull();
		expect(textContent(view.root)).toContain(
			"Agrega tu primer integrante para empezar a gestionar roles, ensayos y colaboraciones.",
		);

		clickButton(findButtonByText(view.root, "Agregar primer miembro"));
		await flushView();

		expect(findByTestId(view.root, "add-member-modal")).not.toBeNull();
		view.unmount();
	});

	it("removes the redundant lower member details block while keeping the polished card summary", async () => {
		repositoryGetMembersMock.mockResolvedValueOnce([
			{ musicianId: "musician-1", role: "ADMIN" },
		]);
		musicianRepositoryGetByIdMock.mockResolvedValueOnce({
			id: "musician-1",
			name: "John Frusciante",
			username: "johnny",
		});
		const view = renderMembersView(() => {
			const store = useBandStore();
			store.selectBand("band-1");
		});

		await flushView();
		await flushView();

		expect(textContent(view.root)).not.toContain("Usuario");
		expect(textContent(view.root)).not.toContain("Rol dentro de la banda");
		expect(textContent(view.root)).toContain("@johnny");
		expect(textContent(view.root)).toContain("Admin");
		expect(textContent(view.root)).not.toContain("Agregar primer miembro");
		view.unmount();
	});

	it("refreshes the member list after adding a new band member successfully", async () => {
		repositoryGetMembersMock
			.mockResolvedValueOnce([{ musicianId: "musician-1", role: "ADMIN" }])
			.mockResolvedValueOnce([
				{ musicianId: "musician-1", role: "ADMIN" },
				{ musicianId: "musician-2", role: "MEMBER" },
			]);
		musicianRepositoryGetByIdMock
			.mockResolvedValueOnce({
				id: "musician-1",
				name: "John Frusciante",
				username: "johnny",
			})
			.mockResolvedValueOnce({
				id: "musician-1",
				name: "John Frusciante",
				username: "johnny",
			})
			.mockResolvedValueOnce({
				id: "musician-2",
				name: "Flea",
				username: "flea",
			});
		const view = renderMembersView(() => {
			const store = useBandStore();
			store.selectBand("band-1");
		});

		await flushView();
		expect(textContent(view.root)).not.toContain("Flea");

		clickButton(findButtonByText(view.root, "Agregar miembro"));
		await flushView();
		setInputValue(
			findByTestId(view.root, "add-member-email-input"),
			"flea@example.com",
		);
		await submitForm(findByTestId(view.root, "add-member-form"));
		await flushView();
		await flushView();

		expect(repositoryAddMemberMock).toHaveBeenCalledWith(
			"band-1",
			new MusicianEmail("flea@example.com"),
		);
		expect(repositoryGetMembersMock).toHaveBeenNthCalledWith(1, "band-1");
		expect(repositoryGetMembersMock).toHaveBeenNthCalledWith(2, "band-1");
		expect(textContent(view.root)).toContain("Flea");
		expect(queryByTestId(view.root, "add-member-modal")).toBeNull();
		expect(useToastStore().toasts).toEqual([
			expect.objectContaining({
				variant: "success",
				message: "Miembro agregado correctamente.",
			}),
		]);
		view.unmount();
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, nextTick } from "vue";

const { routerPushMock, sessionStorage } = vi.hoisted(() => ({
	routerPushMock: vi.fn(),
	sessionStorage: {
		getSelectedBandId: vi.fn<() => string | null>(),
		setSelectedBandId: vi.fn<(bandId: string) => void>(),
		clearSelectedBandId: vi.fn<() => void>(),
		getSkippedBandOnboarding: vi.fn<() => boolean>(),
		setSkippedBandOnboarding: vi.fn<(value: boolean) => void>(),
		clearSkippedBandOnboarding: vi.fn<() => void>(),
	},
}));

vi.mock("../../../../infrastructure/storage/browserSessionStorage.js", () => ({
	browserSessionStorage: sessionStorage,
}));

vi.mock("vue-router", () => ({
	useRouter: () => ({
		push: routerPushMock,
	}),
}));

vi.mock("../../../../infrastructure/band/AxiosBandRepository.js", () => ({
	AxiosBandRepository: class {},
}));

vi.mock("../../../../application/band/CreateBandUseCase.js", () => ({
	CreateBandUseCase: class {
		async run(): Promise<void> {
			return;
		}
	},
}));

import CreateFirstBandView from "./CreateFirstBandView.vue";
import { i18n } from "../../../../infrastructure/config/i18n.js";

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
			return;
		}

		element.props[key] = nextValue;
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

function renderCreateFirstBandView() {
	const pinia = createPinia();
	setActivePinia(pinia);
	const root = createRootNode();
	const app = renderer.createApp(CreateFirstBandView);
	app.use(pinia);
	app.use(i18n);
	app.mount(root);

	return {
		root,
		unmount: () => app.unmount(),
	};
}

function clickElement(element: TestElementNode) {
	const onClick = element.props.onClick;

	if (typeof onClick === "function") {
		onClick({
			type: "click",
			target: element,
			preventDefault() {},
		});
		return;
	}

	throw new Error(`Expected clickable element but found ${element.type}`);
}

async function flushView() {
	for (let index = 0; index < 2; index += 1) {
		await Promise.resolve();
		await nextTick();
	}
}

describe("CreateFirstBandView", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		routerPushMock.mockReset();
		sessionStorage.getSelectedBandId.mockReset();
		sessionStorage.setSelectedBandId.mockReset();
		sessionStorage.clearSelectedBandId.mockReset();
		sessionStorage.getSkippedBandOnboarding.mockReset();
		sessionStorage.setSkippedBandOnboarding.mockReset();
		sessionStorage.clearSkippedBandOnboarding.mockReset();
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(false);
	});

	it("does not offer a skip-for-now option anymore", async () => {
		const view = renderCreateFirstBandView();

		await flushView();

		const skipButton = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				textContent(node).includes("Omitir por ahora"),
		);

		expect(skipButton).toBeNull();

		view.unmount();
	});

	it("opens the create band modal when the create band button is clicked", async () => {
		const view = renderCreateFirstBandView();

		await flushView();

		const createButton = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				textContent(node).includes("Crear una banda"),
		);

		expect(createButton).not.toBeNull();

		if (!createButton) {
			throw new Error("Expected create band button to exist");
		}

		clickElement(createButton);
		await flushView();

		const modalTitle = findElement(
			view.root,
			(node) => node.props.id === "create-band-title",
		);

		expect(modalTitle).not.toBeNull();

		view.unmount();
	});
});

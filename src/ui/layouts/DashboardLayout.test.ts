import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, defineComponent, h, nextTick } from "vue";
import type { Band } from "../../domain/band/Band.js";

const { sessionStorage, routerPushMock, getMyBandsRunMock } = vi.hoisted(
	() => ({
		sessionStorage: {
			getAuthToken: vi.fn<() => string | null>(),
			setAuthToken: vi.fn<(token: string) => void>(),
			clearAuthToken: vi.fn<() => void>(),
			getSelectedBandId: vi.fn<() => string | null>(),
			setSelectedBandId: vi.fn<(bandId: string) => void>(),
			clearSelectedBandId: vi.fn<() => void>(),
			getSkippedBandOnboarding: vi.fn<() => boolean>(),
			setSkippedBandOnboarding: vi.fn<(value: boolean) => void>(),
			clearSkippedBandOnboarding: vi.fn<() => void>(),
		},
		routerPushMock: vi.fn(),
		getMyBandsRunMock: vi.fn<() => Promise<Band[]>>(),
	}),
);

vi.mock("../../infrastructure/storage/browserSessionStorage.js", () => ({
	browserSessionStorage: sessionStorage,
}));

vi.mock("../../infrastructure/band/AxiosBandRepository.js", () => ({
	AxiosBandRepository: class {},
}));

vi.mock("../../application/band/GetMyBandsUseCase.js", () => ({
	GetMyBandsUseCase: class {
		async run(): Promise<Band[]> {
			return getMyBandsRunMock();
		}
	},
}));

vi.mock("vue-router", () => ({
	useRouter: () => ({
		push: routerPushMock,
	}),
}));

import DashboardLayout from "./DashboardLayout.vue";
import { useMusicianStore } from "../stores/useMusicianStore.js";

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

const RouterLinkStub = defineComponent({
	name: "RouterLinkStub",
	props: {
		to: {
			type: [String, Object],
			required: false,
			default: undefined,
		},
	},
	setup(_props, { slots }) {
		return () => h("a", {}, slots.default?.());
	},
});

const RouterViewStub = defineComponent({
	name: "RouterViewStub",
	setup() {
		return () => h("div", { "data-testid": "router-view" });
	},
});

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
	text: string,
): TestElementNode | null {
	return findElement(root, (node) => textContent(node).includes(text));
}

function renderDashboardLayout(setup?: () => void) {
	const pinia = createPinia();
	setActivePinia(pinia);
	setup?.();
	const root = createRootNode();
	const app = renderer.createApp(DashboardLayout);
	app.use(pinia);
	app.component("RouterLink", RouterLinkStub);
	app.component("RouterView", RouterViewStub);
	app.mount(root);

	return {
		root,
		unmount: () => app.unmount(),
	};
}

async function flushView() {
	for (let index = 0; index < 4; index += 1) {
		await Promise.resolve();
		await nextTick();
	}
}

describe("DashboardLayout", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		sessionStorage.getAuthToken.mockReset();
		sessionStorage.setAuthToken.mockReset();
		sessionStorage.clearAuthToken.mockReset();
		sessionStorage.getSelectedBandId.mockReset();
		sessionStorage.setSelectedBandId.mockReset();
		sessionStorage.clearSelectedBandId.mockReset();
		sessionStorage.getSkippedBandOnboarding.mockReset();
		sessionStorage.setSkippedBandOnboarding.mockReset();
		sessionStorage.clearSkippedBandOnboarding.mockReset();
		routerPushMock.mockReset();
		getMyBandsRunMock.mockReset();
		sessionStorage.getAuthToken.mockReturnValue(null);
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(false);
		getMyBandsRunMock.mockResolvedValue([]);
		vi.restoreAllMocks();
	});

	it("keeps the dashboard sidebar available after refresh when a selected band was restored but band loading fails", async () => {
		sessionStorage.getSelectedBandId.mockReturnValue("band-1");
		getMyBandsRunMock.mockRejectedValueOnce(new Error("bands request failed"));
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const view = renderDashboardLayout(() => {
			const musicianStore = useMusicianStore();
			musicianStore.profile = {
				id: "musician-1",
				userId: "user-1",
				username: "keith",
				name: "Keith Richards",
			};
			musicianStore.fetchProfile = vi.fn().mockResolvedValue(undefined);
		});

		await flushView();
		await flushView();

		expect(
			findElement(
				view.root,
				(node) => node.type === "nav" && node.props.id === "sidebarMenu",
			),
		).not.toBeNull();
		expect(findByText(view.root, "Crear banda")).toBeNull();
		expect(consoleErrorSpy).toHaveBeenCalledOnce();

		view.unmount();
	});

	it("keeps the no-band onboarding path when loading confirms there are no bands", async () => {
		getMyBandsRunMock.mockResolvedValueOnce([]);
		const view = renderDashboardLayout(() => {
			const musicianStore = useMusicianStore();
			musicianStore.fetchProfile = vi.fn().mockResolvedValue(undefined);
		});

		await flushView();
		await flushView();

		expect(findByText(view.root, "Crear banda")).not.toBeNull();
		expect(
			findElement(
				view.root,
				(node) => node.type === "nav" && node.props.id === "sidebarMenu",
			),
		).toBeNull();
		expect(routerPushMock).toHaveBeenCalledWith({ name: "CreateFirstBand" });

		view.unmount();
	});
});

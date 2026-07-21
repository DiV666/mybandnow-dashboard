import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, nextTick } from "vue";

import ProfileView from "./ProfileView.vue";
import { useAuthStore } from "../../stores/useAuthStore.js";
import { useMusicianStore } from "../../stores/useMusicianStore.js";
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

function renderProfileView(setup?: () => void) {
	const pinia = createPinia();
	setActivePinia(pinia);
	setup?.();
	const root = createRootNode();
	const app = renderer.createApp(ProfileView);
	app.use(pinia);
	app.mount(root);

	return {
		root,
		unmount: () => app.unmount(),
	};
}

async function flushView(): Promise<void> {
	for (let index = 0; index < 8; index += 1) {
		await Promise.resolve();
		await nextTick();
	}
}

function createMockJwt(payload: Record<string, unknown>): string {
	const encodedPayload = btoa(JSON.stringify(payload));
	return `header.${encodedPayload}.signature`;
}

describe("ProfileView", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useToastStore().clear();
	});

	it("renders the current musician profile after refreshing it on mount", async () => {
		let musicianStore!: ReturnType<typeof useMusicianStore>;
		const view = renderProfileView(() => {
			useAuthStore().token = createMockJwt({
				exp: Math.floor(Date.now() / 1000) + 3600,
				email: "keith@stones.test",
			});
			musicianStore = useMusicianStore();
			musicianStore.profile = {
				id: "profile-1",
				userId: "user-1",
				name: "Keith Richards",
				username: "keith",
			};
			musicianStore.fetchProfile = vi.fn().mockResolvedValue(undefined);
		});
		await flushView();

		expect(musicianStore.fetchProfile).toHaveBeenCalledOnce();
		expect(textContent(view.root)).toContain("Mi Perfil");
		expect(textContent(view.root)).toContain("Keith Richards");
		expect(textContent(view.root)).toContain("@keith");
		expect(textContent(view.root)).toContain(
			"Nombre artísticoKeith RichardsCorreo electrónicokeith@stones.test",
		);
		expect(textContent(view.root)).toContain("ID de músico");
		expect(textContent(view.root)).toContain("ID de usuario");
		expect(textContent(view.root)).toContain("user-1");
		expect(textContent(view.root)).not.toContain(
			"Obtenido desde tu sesión actual, no desde el perfil público.",
		);
		expect(findElement(view.root, (node) => node.type === "form")).toBeNull();

		view.unmount();
	});

	it("falls back to an unavailable message when the auth session does not expose an email", async () => {
		let musicianStore!: ReturnType<typeof useMusicianStore>;
		const view = renderProfileView(() => {
			useAuthStore().token = createMockJwt({
				exp: Math.floor(Date.now() / 1000) + 3600,
			});
			musicianStore = useMusicianStore();
			musicianStore.profile = {
				id: "profile-1",
				userId: "user-1",
				name: "Mick Jagger",
				username: "mick",
			};
			musicianStore.fetchProfile = vi.fn().mockResolvedValue(undefined);
		});
		await flushView();

		expect(textContent(view.root)).toContain(
			"Nombre artísticoMick JaggerCorreo electrónicoNo disponible",
		);
		expect(textContent(view.root)).toContain("ID de usuario");
		expect(textContent(view.root)).toContain("user-1");
		expect(textContent(view.root)).not.toContain(
			"Obtenido desde tu sesión actual, no desde el perfil público.",
		);

		view.unmount();
	});

	it("requests profile completion in the global modal when no profile exists after loading", async () => {
		let musicianStore!: ReturnType<typeof useMusicianStore>;
		let requireProfileCompletionMock!: ReturnType<
			typeof vi.fn<() => Promise<void>>
		>;
		const view = renderProfileView(() => {
			musicianStore = useMusicianStore();
			requireProfileCompletionMock = vi
				.fn<() => Promise<void>>()
				.mockResolvedValue(undefined);
			musicianStore.profile = null;
			musicianStore.fetchProfile = vi.fn().mockResolvedValue(undefined);
			musicianStore.requireProfileCompletion = requireProfileCompletionMock;
		});
		await flushView();

		expect(musicianStore.fetchProfile).toHaveBeenCalledOnce();
		expect(requireProfileCompletionMock).toHaveBeenCalledOnce();
		expect(findElement(view.root, (node) => node.type === "form")).toBeNull();
		expect(textContent(view.root)).toContain("Mi Perfil");

		view.unmount();
	});

	it("reflects the loaded profile after completion without requesting the modal again", async () => {
		let musicianStore!: ReturnType<typeof useMusicianStore>;
		const requireProfileCompletionMock = vi
			.fn<() => Promise<void>>()
			.mockImplementation(async () => {
				musicianStore.profile = {
					id: "profile-2",
					userId: "user-2",
					name: "Jimi Hendrix",
					username: "jimi_hendrix",
				};
			});
		const view = renderProfileView(() => {
			musicianStore = useMusicianStore();
			musicianStore.profile = null;
			musicianStore.fetchProfile = vi.fn().mockResolvedValue(undefined);
			musicianStore.requireProfileCompletion = requireProfileCompletionMock;
		});
		await flushView();
		await flushView();

		expect(requireProfileCompletionMock).toHaveBeenCalledOnce();
		expect(textContent(view.root)).toContain("Jimi Hendrix");
		expect(textContent(view.root)).toContain("@jimi_hendrix");
		expect(findElement(view.root, (node) => node.type === "form")).toBeNull();

		view.unmount();
	});
});

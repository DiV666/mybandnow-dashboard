import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, nextTick } from "vue";
import { useToastStore } from "../stores/useToastStore.js";

interface TestEventTarget {
	addEventListener(type: string, listener: EventListener): void;
	removeEventListener(type: string, listener: EventListener): void;
	dispatchEvent(event: Event): boolean;
}

type TestTextNode = {
	type: "text" | "comment" | "static";
	text: string;
	parent: TestElementNode | null;
};

type TestElementNode = TestEventTarget & {
	type: string;
	props: Record<string, unknown>;
	children: TestNode[];
	text: string;
	parent: TestElementNode | null;
	listeners: Map<string, Set<EventListener>>;
};

type TestNode = TestTextNode | TestElementNode;

type BootstrapToastInstance = {
	show: ReturnType<typeof vi.fn>;
	hide: ReturnType<typeof vi.fn>;
	dispose: ReturnType<typeof vi.fn>;
};

const bootstrapToastGetOrCreateInstance =
	vi.fn<
		(
			element: TestElementNode,
			options?: Record<string, unknown>,
		) => BootstrapToastInstance
	>();
const bootstrapToastInstances = new Map<
	TestElementNode,
	BootstrapToastInstance
>();

vi.mock("bootstrap", () => ({
	Toast: class {
		static getOrCreateInstance(
			element: TestElementNode,
			options?: Record<string, unknown>,
		) {
			bootstrapToastGetOrCreateInstance(element, options);
			const existingInstance = bootstrapToastInstances.get(element);

			if (existingInstance) {
				return existingInstance;
			}

			const instance: BootstrapToastInstance = {
				show: vi.fn(),
				hide: vi.fn(() => {
					element.dispatchEvent(new Event("hidden.bs.toast"));
				}),
				dispose: vi.fn(),
			};
			bootstrapToastInstances.set(element, instance);
			return instance;
		}
	},
}));

import AppToastViewport from "./AppToastViewport.vue";

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
		return createElementNode(type);
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

function createElementNode(type: string): TestElementNode {
	return {
		type,
		props: {},
		children: [],
		text: "",
		parent: null,
		listeners: new Map(),
		addEventListener(eventType, listener) {
			const listeners =
				this.listeners.get(eventType) ?? new Set<EventListener>();
			listeners.add(listener);
			this.listeners.set(eventType, listeners);
		},
		removeEventListener(eventType, listener) {
			this.listeners.get(eventType)?.delete(listener);
		},
		dispatchEvent(event) {
			this.listeners.get(event.type)?.forEach((listener) => listener(event));
			return true;
		},
	};
}

function createRootNode(): TestElementNode {
	return createElementNode("root");
}

function mountViewport(): {
	app: ReturnType<typeof renderer.createApp>;
	root: TestElementNode;
} {
	const pinia = createPinia();
	setActivePinia(pinia);
	const root = createRootNode();
	const app = renderer.createApp(AppToastViewport);
	app.use(pinia);
	app.mount(root);
	return { app, root };
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

function findToast(root: TestElementNode): TestElementNode | null {
	return findElement(
		root,
		(node) =>
			node.type === "div" &&
			String(node.props.class ?? "")
				.split(" ")
				.includes("toast"),
	);
}

function findToastBody(root: TestElementNode): TestElementNode | null {
	return findElement(
		root,
		(node) =>
			node.type === "div" &&
			String(node.props.class ?? "")
				.split(" ")
				.includes("toast-body"),
	);
}

describe("AppToastViewport", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		bootstrapToastGetOrCreateInstance.mockReset();
		bootstrapToastInstances.clear();
	});

	it("renders a native Bootstrap toast container and configures success toasts for polite auto-hide", async () => {
		const { app, root } = mountViewport();
		const store = useToastStore();
		store.success("Miembro agregado correctamente.");
		await nextTick();

		const viewport = findElement(
			root,
			(node) => node.props["data-testid"] === "toast-viewport",
		);
		const toast = findToast(root);
		const toastBody = findToastBody(root);
		const closeButton = findElement(root, (node) => node.type === "button");
		const toastInstance = toast
			? bootstrapToastInstances.get(toast)
			: undefined;

		expect(viewport).not.toBeNull();
		expect(String(viewport?.props.class ?? "")).toContain("toast-container");
		expect(String(viewport?.props.class ?? "")).toContain("top-0");
		expect(String(viewport?.props.class ?? "")).toContain("end-0");
		expect(toast).not.toBeNull();
		expect(String(toast?.props.class ?? "")).toContain("toast");
		expect(String(toast?.props.class ?? "")).toContain("text-bg-success");
		expect(toast?.props.role).toBe("status");
		expect(toast?.props["aria-live"]).toBe("polite");
		expect(textContent(root)).toContain("Miembro agregado correctamente.");
		expect(toastBody).not.toBeNull();
		if (!toastBody) {
			throw new Error("Expected toast body to be rendered");
		}
		expect(textContent(toastBody)).toContain("Miembro agregado correctamente.");
		expect(closeButton?.props["data-bs-dismiss"]).toBe("toast");
		expect(bootstrapToastGetOrCreateInstance).toHaveBeenCalledWith(toast, {
			autohide: true,
			delay: 5000,
		});
		expect(toast?.props["data-bs-delay"]).toBe(5000);
		expect(toast?.props["data-bs-autohide"]).toBe("true");
		expect(toastInstance?.show).toHaveBeenCalledTimes(1);

		app.unmount();
	});

	it("hides and removes an error toast through the Bootstrap instance", async () => {
		const { app, root } = mountViewport();
		const store = useToastStore();
		const toastId = store.show({
			message: "Credenciales inválidas",
			variant: "error",
			durationMs: 9000,
		});
		await nextTick();

		const toast = findToast(root);
		const closeButton = findElement(root, (node) => node.type === "button");
		const toastInstance = toast
			? bootstrapToastInstances.get(toast)
			: undefined;

		expect(toast).not.toBeNull();
		expect(String(toast?.props.class ?? "")).toContain("text-bg-danger");
		expect(toast?.props.role).toBe("alert");
		expect(toast?.props["aria-live"]).toBe("assertive");
		expect(toast?.props["data-bs-delay"]).toBe(9000);
		expect(bootstrapToastGetOrCreateInstance).toHaveBeenCalledWith(toast, {
			autohide: true,
			delay: 9000,
		});
		expect(toastInstance).toBeDefined();
		expect(store.toasts).toHaveLength(1);

		const onClick = closeButton?.props.onClick as (() => void) | undefined;
		expect(onClick).toBeDefined();
		onClick?.();
		await nextTick();

		expect(toastInstance?.hide).toHaveBeenCalledTimes(1);
		expect(store.toasts).toEqual([]);
		expect(toastId).toBeGreaterThan(0);

		app.unmount();
		expect(toastInstance?.dispose).toHaveBeenCalledTimes(1);
	});
});

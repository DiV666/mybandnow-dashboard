import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createPinia, setActivePinia } from "pinia";
import BackendUnavailableModal from "./BackendUnavailableModal.vue";
import { useBackendStatusStore } from "../stores/useBackendStatusStore.js";

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
	if (isElementNode(node)) {
		if (predicate(node)) {
			return node;
		}

		for (const child of node.children) {
			const match = findElement(child, predicate);
			if (match) {
				return match;
			}
		}
	}

	return null;
}

function clickButton(button: TestElementNode): void {
	const onClick = button.props.onClick;

	if (typeof onClick !== "function") {
		throw new Error("Click handler was not found.");
	}

	onClick({ preventDefault() {} });
}

describe("BackendUnavailableModal", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("renders the backend-unavailable message with retry and close actions", async () => {
		const pinia = createPinia();
		setActivePinia(pinia);
		const store = useBackendStatusStore();
		store.markUnavailable();

		const app = createSSRApp(BackendUnavailableModal);
		app.use(pinia);

		const markup = await renderToString(app);

		expect(markup).toContain("Servidor no disponible");
		expect(markup).toContain('data-testid="backend-unavailable-close"');
		expect(markup).toContain('data-testid="backend-unavailable-retry"');
	});

	it("clears the backend-unavailable state when retry is clicked without reloading the page", () => {
		const reload = vi.fn();
		vi.stubGlobal("window", {
			location: {
				reload,
			},
		});
		const pinia = createPinia();
		setActivePinia(pinia);
		const store = useBackendStatusStore();
		store.markUnavailable();
		const root = createRootNode();

		const app = renderer.createApp(BackendUnavailableModal);
		app.use(pinia);
		app.mount(root);

		const retryButton = findElement(
			root,
			(node) => node.props["data-testid"] === "backend-unavailable-retry",
		);

		if (!retryButton) {
			throw new Error("Retry button was not found.");
		}

		clickButton(retryButton);

		expect(store.isBackendUnavailable).toBe(false);
		expect(reload).not.toHaveBeenCalled();

		app.unmount();
	});

	it("keeps the close action clearing the backend-unavailable state", () => {
		const pinia = createPinia();
		setActivePinia(pinia);
		const store = useBackendStatusStore();
		store.markUnavailable();
		const root = createRootNode();

		const app = renderer.createApp(BackendUnavailableModal);
		app.use(pinia);
		app.mount(root);

		const closeButton = findElement(
			root,
			(node) => node.props["data-testid"] === "backend-unavailable-close",
		);

		if (!closeButton) {
			throw new Error("Close button was not found.");
		}

		clickButton(closeButton);

		expect(store.isBackendUnavailable).toBe(false);

		app.unmount();
	});
});

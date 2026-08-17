import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRenderer, defineComponent, h, nextTick } from "vue";
import type { Band } from "../../domain/band/Band.js";
import type { SongResponse } from "../../domain/song/SongResponse.js";
import type { BandMemberResponse } from "../../domain/band/BandMemberResponse.js";

const {
	sessionStorage,
	routerPushMock,
	getMyBandsRunMock,
	getBandSongsRunMock,
	getBandMembersRunMock,
	currentRouteState,
	documentListeners,
} = vi.hoisted(() => ({
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
	getBandSongsRunMock: vi.fn<() => Promise<SongResponse[]>>(),
	getBandMembersRunMock: vi.fn<() => Promise<BandMemberResponse[]>>(),
	currentRouteState: {
		path: "/dashboard",
	},
	documentListeners: new Map<string, Set<(event: TestEvent) => void>>(),
}));

vi.mock("../../infrastructure/storage/browserSessionStorage.js", () => ({
	browserSessionStorage: sessionStorage,
}));

vi.mock("../../infrastructure/band/AxiosBandRepository.js", () => ({
	AxiosBandRepository: class {},
}));

vi.mock("../../infrastructure/song/AxiosSongRepository.js", () => ({
	AxiosSongRepository: class {},
}));

vi.mock("../../application/band/GetMyBandsUseCase.js", () => ({
	GetMyBandsUseCase: class {
		run(): Promise<Band[]> {
			return getMyBandsRunMock();
		}
	},
}));

vi.mock("../../application/song/GetBandSongsUseCase.js", () => ({
	GetBandSongsUseCase: class {
		run(): Promise<SongResponse[]> {
			return getBandSongsRunMock();
		}
	},
}));

vi.mock("../../application/band/GetBandMembersUseCase.js", () => ({
	GetBandMembersUseCase: class {
		run(): Promise<BandMemberResponse[]> {
			return getBandMembersRunMock();
		}
	},
}));

vi.mock("vue-router", () => ({
	useRouter: () => ({
		push: routerPushMock,
	}),
}));

import DashboardLayout from "./DashboardLayout.vue";
import { i18n } from "../../infrastructure/config/i18n.js";
import { useAuthStore } from "../stores/useAuthStore.js";
import { useBandStore } from "../stores/useBandStore.js";
import { useMusicianStore } from "../stores/useMusicianStore.js";

function classNames(node: TestElementNode): string {
	return String(node.props.class ?? "");
}

type TestTextNode = {
	type: "text" | "comment" | "static";
	text: string;
	parent: TestElementNode | null;
};

type TestEvent = {
	type: string;
	target?: unknown;
	key?: string;
	preventDefault?: () => void;
};

type TestElementNode = {
	type: string;
	props: Record<string, unknown>;
	children: TestNode[];
	text: string;
	parent: TestElementNode | null;
	listeners: Record<string, Array<(event: TestEvent) => void>>;
	options?: TestElementNode[];
	multiple?: boolean;
	value?: unknown;
	selectedIndex?: number;
	[key: string]: unknown;
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

const routePathsByName: Record<string, string> = {
	CreateFirstBand: "/dashboard/create-first-band",
	MembersManager: "/dashboard/members",
	Profile: "/dashboard/profile",
	SongsManager: "/dashboard/songs",
	VideoclipsManager: "/dashboard/videoclips",
};

const RouterLinkStub = defineComponent({
	name: "RouterLinkStub",
	props: {
		to: {
			type: [String, Object],
			required: false,
			default: undefined,
		},
		activeClass: {
			type: String,
			required: false,
			default: "router-link-active",
		},
		exactActiveClass: {
			type: String,
			required: false,
			default: "router-link-exact-active",
		},
		class: {
			type: String,
			required: false,
			default: "",
		},
	},
	setup(props, { slots }) {
		return () => {
			const resolvedPath =
				typeof props.to === "object" && props.to !== null && "name" in props.to
					? routePathsByName[String(props.to.name)]
					: typeof props.to === "string"
						? props.to
						: "";
			const classNames = [props.class];

			if (resolvedPath && currentRouteState.path === resolvedPath) {
				classNames.push(props.activeClass, props.exactActiveClass);
			} else if (
				resolvedPath &&
				currentRouteState.path.startsWith(`${resolvedPath}/`)
			) {
				classNames.push(props.activeClass);
			}

			return h(
				"a",
				{ class: classNames.filter(Boolean).join(" ") },
				slots.default?.(),
			);
		};
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
			delete element[key];
			return;
		}

		element.props[key] = nextValue;
		element[key] = nextValue;
	},
	insert(child, parent, anchor) {
		child.parent = parent;
		const anchorIndex = anchor ? parent.children.indexOf(anchor) : -1;

		if (anchorIndex >= 0) {
			parent.children.splice(anchorIndex, 0, child);
		} else {
			parent.children.push(child);
		}

		if (
			parent.type === "select" &&
			isElementNode(child) &&
			child.type === "option"
		) {
			(parent.options ??= []).push(child);
		}
	},
	remove(child) {
		if (!child.parent) {
			return;
		}

		const parent = child.parent;
		const index = parent.children.indexOf(child);
		if (index >= 0) {
			parent.children.splice(index, 1);
		}
		if (
			parent.type === "select" &&
			isElementNode(child) &&
			child.type === "option"
		) {
			parent.options = (parent.options ?? []).filter(
				(candidate) => candidate !== child,
			);
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
			options: type === "select" ? [] : undefined,
			multiple: type === "select" ? false : undefined,
			selectedIndex: type === "select" ? -1 : undefined,
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

function findAllElements(
	node: TestNode,
	predicate: (candidate: TestElementNode) => boolean,
): TestElementNode[] {
	const matches: TestElementNode[] = [];

	if (isElementNode(node) && predicate(node)) {
		matches.push(node);
	}

	if (!isElementNode(node)) {
		return matches;
	}

	for (const child of node.children) {
		matches.push(...findAllElements(child, predicate));
	}

	return matches;
}

function dispatchDocumentEvent(event: TestEvent) {
	for (const listener of documentListeners.get(event.type) ?? []) {
		listener(event);
	}
}

function renderDashboardLayout(setup?: () => void) {
	const pinia = createPinia();
	setActivePinia(pinia);
	setup?.();
	const root = createRootNode();
	const app = renderer.createApp(DashboardLayout);
	app.use(pinia);
	app.use(i18n);
	app.component("RouterLink", RouterLinkStub);
	app.component("RouterView", RouterViewStub);
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
	for (let index = 0; index < 4; index += 1) {
		await Promise.resolve();
		await nextTick();
	}
}

describe("DashboardLayout", () => {
	beforeEach(() => {
		documentListeners.clear();
		Object.defineProperty(globalThis, "document", {
			configurable: true,
			value: {
				documentElement: {
					dataset: {} as Record<string, string>,
					getAttribute(_name: string) {
						return null;
					},
				},
				getElementById(_id: string) {
					return null;
				},
				addEventListener(type: string, listener: (event: TestEvent) => void) {
					const listeners = documentListeners.get(type) ?? new Set();
					listeners.add(listener);
					documentListeners.set(type, listeners);
				},
				removeEventListener(
					type: string,
					listener: (event: TestEvent) => void,
				) {
					documentListeners.get(type)?.delete(listener);
				},
			},
		});
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
		getBandSongsRunMock.mockReset();
		getBandMembersRunMock.mockReset();
		sessionStorage.getAuthToken.mockReturnValue(null);
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(false);
		getMyBandsRunMock.mockResolvedValue([]);
		getBandSongsRunMock.mockResolvedValue([]);
		getBandMembersRunMock.mockResolvedValue([]);
		currentRouteState.path = "/dashboard";
		vi.restoreAllMocks();
	});

	it("renders user actions inside a dropdown, including the profile entry, and preserves logout behavior", async () => {
		sessionStorage.getSelectedBandId.mockReturnValue("band-1");
		getMyBandsRunMock.mockRejectedValueOnce(new Error("bands request failed"));
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const view = renderDashboardLayout(() => {
			const authStore = useAuthStore();
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			authStore.token = "token";
			bandStore.selectedBandId = "band-1";
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

		const dropdownToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["aria-expanded"] ?? "") === "false" &&
				textContent(node).includes("Keith Richards"),
		);

		expect(dropdownToggle).not.toBeNull();
		expect(findByText(view.root, "Cerrar sesión")).toBeNull();
		expect(
			findElement(
				view.root,
				(node) =>
					node.type === "strong" && textContent(node) === "Bienvenido, ",
			),
		).not.toBeNull();
		expect(
			findElement(
				view.root,
				(node) =>
					node.type === "strong" &&
					textContent(node).includes("Keith Richards"),
			),
		).toBeNull();

		if (!dropdownToggle) {
			throw new Error("Expected user dropdown toggle to exist");
		}

		clickElement(dropdownToggle);
		await flushView();

		const profileAction = findElement(
			view.root,
			(node) =>
				node.type === "button" && textContent(node).includes("Mi Perfil"),
		);
		const logoutAction = findElement(
			view.root,
			(node) =>
				node.type === "button" && textContent(node).includes("Cerrar sesión"),
		);

		expect(profileAction).not.toBeNull();
		expect(logoutAction).not.toBeNull();

		if (!profileAction) {
			throw new Error("Expected profile action to exist inside user dropdown");
		}

		clickElement(profileAction);
		await flushView();
		expect(routerPushMock).toHaveBeenCalledWith({ name: "Profile" });

		clickElement(dropdownToggle);
		await flushView();

		const reopenedLogoutAction = findElement(
			view.root,
			(node) =>
				node.type === "button" && textContent(node).includes("Cerrar sesión"),
		);

		expect(reopenedLogoutAction).not.toBeNull();

		if (!reopenedLogoutAction) {
			throw new Error("Expected logout action to exist inside user dropdown");
		}

		clickElement(reopenedLogoutAction);

		const authStore = useAuthStore();
		const bandStore = useBandStore();
		const musicianStore = useMusicianStore();

		expect(sessionStorage.clearAuthToken).toHaveBeenCalledOnce();
		expect(authStore.token).toBeNull();
		expect(bandStore.selectedBandId).toBeNull();
		expect(musicianStore.profile).toBeNull();
		expect(routerPushMock).toHaveBeenCalledWith({ name: "Landing" });
		expect(consoleErrorSpy).toHaveBeenCalledOnce();

		view.unmount();
	});

	it("applies the same dominant toggle treatment to the band and user header dropdowns", async () => {
		getMyBandsRunMock.mockResolvedValueOnce([
			{
				id: { value: "band-1" },
				name: { value: "The Stones" },
			} as Band,
		]);
		const view = renderDashboardLayout(() => {
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			bandStore.selectedBandId = "band-1";
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

		const bandSwitcherToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["data-testid"] ?? "") === "band-switcher-toggle",
		);
		const userMenuToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["aria-haspopup"] ?? "") === "true" &&
				textContent(node).includes("Keith Richards"),
		);

		expect(bandSwitcherToggle).not.toBeNull();
		expect(userMenuToggle).not.toBeNull();
		expect(classNames(bandSwitcherToggle as TestElementNode)).toContain(
			"dashboard-header-dropdown-toggle",
		);
		expect(classNames(userMenuToggle as TestElementNode)).toContain(
			"dashboard-header-dropdown-toggle",
		);
		expect(classNames(bandSwitcherToggle as TestElementNode)).not.toContain(
			"dashboard-band-toggle",
		);

		view.unmount();
	});

	it("keeps the stable user dropdown treatment even when the band switcher is not rendered", async () => {
		getMyBandsRunMock.mockResolvedValueOnce([]);
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

		const bandSwitcherToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["data-testid"] ?? "") === "band-switcher-toggle",
		);
		const userMenuToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["aria-haspopup"] ?? "") === "true" &&
				textContent(node).includes("Keith Richards"),
		);

		expect(bandSwitcherToggle).toBeNull();
		expect(userMenuToggle).not.toBeNull();
		expect(classNames(userMenuToggle as TestElementNode)).toContain(
			"dashboard-header-dropdown-toggle",
		);

		view.unmount();
	});

	it("renders the band menu with the same dropdown family treatment as the user menu while keeping the active band marker", async () => {
		getMyBandsRunMock.mockResolvedValueOnce([
			{
				id: { value: "band-1" },
				name: { value: "The Stones" },
			} as Band,
			{
				id: { value: "band-2" },
				name: { value: "The Beatles" },
			} as Band,
		]);
		const view = renderDashboardLayout(() => {
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			bandStore.selectedBandId = "band-1";
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

		const bandSwitcherToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["data-testid"] ?? "") === "band-switcher-toggle",
		);

		if (!bandSwitcherToggle) {
			throw new Error("Expected custom band switcher toggle to exist");
		}

		clickElement(bandSwitcherToggle);
		await flushView();

		const bandMenu = findElement(
			view.root,
			(node) =>
				node.type === "div" &&
				classNames(node).includes("dashboard-header-dropdown-panel") &&
				!classNames(node).includes("dropdown-menu-end"),
		);
		const activeBandOption = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["data-band-option"] ?? "") === "true" &&
				classNames(node).includes("dashboard-band-option--active") &&
				textContent(node).includes("The Stones"),
		);

		expect(bandMenu).not.toBeNull();
		expect(classNames(bandMenu as TestElementNode)).toContain(
			"dashboard-header-dropdown-menu",
		);
		expect(classNames(bandMenu as TestElementNode)).not.toContain(
			"dashboard-band-menu",
		);
		expect(classNames(activeBandOption as TestElementNode)).toContain(
			"dropdown-item",
		);
		expect(activeBandOption).not.toBeNull();
		expect(textContent(activeBandOption as TestElementNode)).toContain("✓");

		view.unmount();
	});

	it("centers the band switcher in the topbar and lets the user change the active band from a custom dropdown", async () => {
		getMyBandsRunMock.mockResolvedValueOnce([
			{
				id: { value: "band-1" },
				name: { value: "The Stones" },
			} as Band,
			{
				id: { value: "band-2" },
				name: { value: "The Beatles" },
			} as Band,
		]);
		const view = renderDashboardLayout(() => {
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			bandStore.selectedBandId = "band-1";
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

		const centeredSection = findElement(
			view.root,
			(node) =>
				node.type === "div" &&
				classNames(node).includes("dashboard-topbar__center"),
		);
		const bandSwitcherToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["data-testid"] ?? "") === "band-switcher-toggle",
		);
		const nativeBandSelect = findElement(
			view.root,
			(node) =>
				node.type === "select" &&
				String(node.props.id ?? "") === "band-selector",
		);
		const userNav = findElement(
			view.root,
			(node) =>
				node.type === "div" &&
				classNames(node).includes("dashboard-topbar__end"),
		);

		expect(centeredSection).not.toBeNull();
		expect(bandSwitcherToggle).not.toBeNull();
		expect(nativeBandSelect).toBeNull();
		expect(userNav).not.toBeNull();
		expect(textContent(bandSwitcherToggle as TestElementNode)).toContain(
			"The Stones",
		);
		expect(
			centeredSection
				? findElement(centeredSection, (node) => node === bandSwitcherToggle)
				: null,
		).toBe(bandSwitcherToggle);
		expect(findByText(view.root, "The Beatles")).toBeNull();

		if (!bandSwitcherToggle) {
			throw new Error("Expected custom band switcher toggle to exist");
		}

		clickElement(bandSwitcherToggle);
		await flushView();

		const nextBandOption = findElement(
			view.root,
			(node) =>
				node.type === "button" && textContent(node).includes("The Beatles"),
		);

		expect(nextBandOption).not.toBeNull();

		if (!nextBandOption) {
			throw new Error("Expected custom band option to exist");
		}

		clickElement(nextBandOption);
		await flushView();

		const bandStore = useBandStore();
		expect(bandStore.selectedBandId).toBe("band-2");
		expect(findByText(view.root, "The Beatles")).not.toBeNull();
		expect(
			findElement(
				view.root,
				(node) =>
					node.type === "button" &&
					textContent(node).includes("The Beatles") &&
					String(node.props["data-band-option"] ?? "") === "true",
			),
		).toBeNull();

		view.unmount();
	});

	it("toggles the custom band dropdown open and closed from the header control", async () => {
		getMyBandsRunMock.mockResolvedValueOnce([
			{
				id: { value: "band-1" },
				name: { value: "The Stones" },
			} as Band,
			{
				id: { value: "band-2" },
				name: { value: "The Beatles" },
			} as Band,
		]);
		const view = renderDashboardLayout(() => {
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			bandStore.selectedBandId = "band-1";
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

		const bandSwitcherToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["data-testid"] ?? "") === "band-switcher-toggle",
		);

		expect(findByText(view.root, "The Beatles")).toBeNull();

		if (!bandSwitcherToggle) {
			throw new Error("Expected custom band switcher toggle to exist");
		}

		clickElement(bandSwitcherToggle);
		await flushView();
		expect(findByText(view.root, "The Beatles")).not.toBeNull();

		clickElement(bandSwitcherToggle);
		await flushView();
		expect(
			findElement(
				view.root,
				(node) =>
					node.type === "button" &&
					textContent(node).includes("The Beatles") &&
					String(node.props["data-band-option"] ?? "") === "true",
			),
		).toBeNull();

		view.unmount();
	});

	it("closes the other header dropdown when opening one and closes both on outside click", async () => {
		getMyBandsRunMock.mockResolvedValueOnce([
			{
				id: { value: "band-1" },
				name: { value: "The Stones" },
			} as Band,
			{
				id: { value: "band-2" },
				name: { value: "The Beatles" },
			} as Band,
		]);
		const view = renderDashboardLayout(() => {
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			bandStore.selectedBandId = "band-1";
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

		const bandSwitcherToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["data-testid"] ?? "") === "band-switcher-toggle",
		);
		const userMenuToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["aria-haspopup"] ?? "") === "true" &&
				textContent(node).includes("Keith Richards"),
		);

		if (!bandSwitcherToggle || !userMenuToggle) {
			throw new Error("Expected both dropdown toggles to exist");
		}

		clickElement(bandSwitcherToggle);
		await flushView();
		expect(findByText(view.root, "The Beatles")).not.toBeNull();

		clickElement(userMenuToggle);
		await flushView();
		expect(findByText(view.root, "Mi Perfil")).not.toBeNull();
		expect(
			findElement(
				view.root,
				(node) =>
					node.type === "button" &&
					textContent(node).includes("The Beatles") &&
					String(node.props["data-band-option"] ?? "") === "true",
			),
		).toBeNull();

		dispatchDocumentEvent({
			type: "click",
			target: createRootNode(),
			preventDefault() {},
		});
		await flushView();

		expect(findByText(view.root, "Mi Perfil")).toBeNull();
		view.unmount();
	});

	it("closes open header dropdowns on Escape", async () => {
		getMyBandsRunMock.mockResolvedValueOnce([
			{
				id: { value: "band-1" },
				name: { value: "The Stones" },
			} as Band,
		]);
		const view = renderDashboardLayout(() => {
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			bandStore.selectedBandId = "band-1";
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

		const bandSwitcherToggle = findElement(
			view.root,
			(node) =>
				node.type === "button" &&
				String(node.props["data-testid"] ?? "") === "band-switcher-toggle",
		);

		if (!bandSwitcherToggle) {
			throw new Error("Expected band dropdown toggle to exist");
		}

		clickElement(bandSwitcherToggle);
		await flushView();
		expect(findByText(view.root, "The Stones")).not.toBeNull();

		dispatchDocumentEvent({
			type: "keydown",
			key: "Escape",
			target: bandSwitcherToggle,
			preventDefault() {},
		});
		await flushView();

		expect(
			findElement(
				view.root,
				(node) =>
					node.type === "button" &&
					textContent(node).includes("The Stones") &&
					String(node.props["data-band-option"] ?? "") === "true",
			),
		).toBeNull();
		view.unmount();
	});

	it("redirects to create-first-band and hides the dashboard shell when band loading fails after restoring a stale selection", async () => {
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
		).toBeNull();
		expect(findByText(view.root, "Crear banda")).not.toBeNull();
		expect(routerPushMock).toHaveBeenCalledWith({ name: "CreateFirstBand" });
		expect(consoleErrorSpy).toHaveBeenCalledOnce();
		expect(sessionStorage.clearSelectedBandId).toHaveBeenCalledOnce();

		view.unmount();
	});

	it("renders a Bootstrap-first sidebar nav while preserving the dashboard modules, icons, and active route styling", async () => {
		currentRouteState.path = "/dashboard/songs";
		getMyBandsRunMock.mockResolvedValueOnce([
			{
				id: { value: "band-1" },
				name: { value: "The Stones" },
			} as Band,
		]);
		const view = renderDashboardLayout(() => {
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			bandStore.selectedBandId = "band-1";
			musicianStore.fetchProfile = vi.fn().mockResolvedValue(undefined);
		});

		await flushView();
		await flushView();

		const sidebarNavList = findElement(
			view.root,
			(node) =>
				node.type === "ul" &&
				classNames(node).includes("nav-pills") &&
				classNames(node).includes("flex-column"),
		);
		const navLinks = findAllElements(
			view.root,
			(node) =>
				node.type === "a" &&
				classNames(node).includes("dashboard-sidebar-link"),
		).map((node) => textContent(node).trim());
		const songsLink = findElement(
			view.root,
			(node) => node.type === "a" && textContent(node).includes("Canciones"),
		);
		const membersLink = findElement(
			view.root,
			(node) => node.type === "a" && textContent(node).includes("Miembros"),
		);
		const videoclipsLink = findElement(
			view.root,
			(node) => node.type === "a" && textContent(node).includes("Videoclips"),
		);
		const songsIcon = songsLink
			? findElement(
					songsLink,
					(node) =>
						node.type === "i" &&
						classNames(node).includes("bi-music-note-list"),
				)
			: null;
		const membersIcon = membersLink
			? findElement(
					membersLink,
					(node) => node.type === "i" && classNames(node).includes("bi-people"),
				)
			: null;
		const videoclipsIcon = videoclipsLink
			? findElement(
					videoclipsLink,
					(node) =>
						node.type === "i" && classNames(node).includes("bi-camera-video"),
				)
			: null;

		expect(sidebarNavList).not.toBeNull();
		expect(navLinks).toEqual(["Canciones0", "Miembros0", "Videoclips"]);
		expect(findByText(view.root, "Inicio")).toBeNull();
		expect(classNames(songsLink as TestElementNode)).toContain("nav-link");
		expect(classNames(songsLink as TestElementNode)).toContain("d-flex");
		expect(classNames(songsLink as TestElementNode)).toContain(
			"align-items-center",
		);
		expect(classNames(songsLink as TestElementNode)).toContain("gap-2");
		expect(classNames(songsLink as TestElementNode)).toContain("rounded-0");
		expect(classNames(songsLink as TestElementNode)).toContain("active");
		expect(classNames(songsLink as TestElementNode)).toContain("fw-semibold");
		expect(classNames(songsLink as TestElementNode)).toContain(
			"dashboard-sidebar-link--active",
		);
		expect(classNames(songsLink as TestElementNode)).not.toContain(
			"text-primary",
		);
		expect(classNames(songsLink as TestElementNode)).not.toContain(
			"dashboard-nav-link",
		);
		expect(classNames(membersLink as TestElementNode)).not.toContain("active");
		expect(songsIcon).not.toBeNull();
		expect(membersIcon).not.toBeNull();
		expect(videoclipsIcon).not.toBeNull();
		expect(classNames(songsIcon as TestElementNode)).toContain(
			"dashboard-sidebar-link__icon",
		);
		expect(classNames(membersIcon as TestElementNode)).toContain(
			"dashboard-sidebar-link__icon",
		);
		expect(classNames(videoclipsIcon as TestElementNode)).toContain(
			"dashboard-sidebar-link__icon",
		);

		view.unmount();
	});

	it("shows the songs and members totals as badges next to the sidebar links, but not for videoclips", async () => {
		getMyBandsRunMock.mockResolvedValueOnce([
			{
				id: { value: "band-1" },
				name: { value: "The Stones" },
			} as Band,
		]);
		getBandSongsRunMock.mockResolvedValueOnce([
			{ id: "song-1" } as SongResponse,
		]);
		getBandMembersRunMock.mockResolvedValueOnce([
			{ musicianId: "musician-1" } as BandMemberResponse,
			{ musicianId: "musician-2" } as BandMemberResponse,
		]);
		const view = renderDashboardLayout(() => {
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			bandStore.selectedBandId = "band-1";
			musicianStore.fetchProfile = vi.fn().mockResolvedValue(undefined);
		});

		await flushView();
		await flushView();
		await flushView();

		const songsLink = findElement(
			view.root,
			(node) =>
				node.type === "a" && textContent(node).includes("Canciones"),
		);
		const membersLink = findElement(
			view.root,
			(node) => node.type === "a" && textContent(node).includes("Miembros"),
		);
		const videoclipsLink = findElement(
			view.root,
			(node) => node.type === "a" && textContent(node).includes("Videoclips"),
		);

		expect(textContent(songsLink as TestElementNode).trim()).toBe(
			"Canciones1",
		);
		expect(textContent(membersLink as TestElementNode).trim()).toBe(
			"Miembros2",
		);
		expect(textContent(videoclipsLink as TestElementNode).trim()).toBe(
			"Videoclips",
		);

		view.unmount();
	});

	it("keeps Bootstrap nav semantics on inactive dashboard links too", async () => {
		currentRouteState.path = "/dashboard/members";
		getMyBandsRunMock.mockResolvedValueOnce([
			{
				id: { value: "band-1" },
				name: { value: "The Stones" },
			} as Band,
		]);
		const view = renderDashboardLayout(() => {
			const bandStore = useBandStore();
			const musicianStore = useMusicianStore();
			bandStore.selectedBandId = "band-1";
			musicianStore.fetchProfile = vi.fn().mockResolvedValue(undefined);
		});

		await flushView();
		await flushView();

		const songsLink = findElement(
			view.root,
			(node) => node.type === "a" && textContent(node).includes("Canciones"),
		);
		const membersLink = findElement(
			view.root,
			(node) => node.type === "a" && textContent(node).includes("Miembros"),
		);

		expect(classNames(songsLink as TestElementNode)).toContain("nav-link");
		expect(classNames(songsLink as TestElementNode)).toContain(
			"dashboard-sidebar-link",
		);
		expect(classNames(songsLink as TestElementNode)).not.toContain("active");
		expect(classNames(membersLink as TestElementNode)).toContain("active");
		expect(classNames(membersLink as TestElementNode)).toContain("fw-semibold");
		expect(classNames(membersLink as TestElementNode)).toContain(
			"dashboard-sidebar-link--active",
		);
		expect(classNames(membersLink as TestElementNode)).not.toContain(
			"text-primary",
		);

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

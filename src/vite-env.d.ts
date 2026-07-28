/// <reference types="vite/client" />

declare module "*.vue" {
	import type { DefineComponent } from "vue";

	const component: DefineComponent<
		Record<string, never>,
		Record<string, never>,
		unknown
	>;
	export default component;
}

declare module "bootstrap" {
	export class Tooltip {
		constructor(element: Element, options?: unknown);
		static getOrCreateInstance(element: Element, options?: unknown): Tooltip;
		dispose(): void;
	}

	export class Toast {
		constructor(element: Element, options?: unknown);
		show(): void;
		hide(): void;
		dispose(): void;
		static getOrCreateInstance(element: Element, options?: unknown): Toast;
	}

	export class Offcanvas {
		constructor(element: Element, options?: unknown);
		show(): void;
		hide(): void;
		dispose(): void;
		static getOrCreateInstance(element: Element, options?: unknown): Offcanvas;
	}

	export class Dropdown {
		constructor(element: Element, options?: unknown);
		show(): void;
		hide(): void;
		dispose(): void;
		static getOrCreateInstance(element: Element, options?: unknown): Dropdown;
	}
}

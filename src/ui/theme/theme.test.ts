import { beforeEach, describe, expect, it, vi } from "vitest";
import { browserSessionStorage } from "../../infrastructure/storage/browserSessionStorage.js";
import { applyNextTheme, resolveInitialTheme, THEMES } from "./theme.ts";

describe("theme", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		vi.stubGlobal("document", {
			documentElement: {
				dataset: { bsTheme: "light" },
			},
		});
		const storage = new Map<string, string>();

		vi.stubGlobal("localStorage", {
			getItem: vi.fn((key: string) => storage.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => {
				storage.set(key, value);
			}),
			removeItem: vi.fn((key: string) => {
				storage.delete(key);
			}),
		});
	});

	it("prefers an explicit stored theme over the current attribute and system preference", () => {
		expect(
			resolveInitialTheme({
				storedTheme: "dark",
				currentTheme: "light",
				prefersDark: false,
			}),
		).toBe("dark");
	});

	it("preserves an existing document theme when there is no stored preference", () => {
		expect(
			resolveInitialTheme({
				storedTheme: null,
				currentTheme: "dark",
				prefersDark: false,
			}),
		).toBe("dark");
	});

	it("falls back to the system preference only when no explicit theme exists", () => {
		expect(
			resolveInitialTheme({
				storedTheme: null,
				currentTheme: null,
				prefersDark: true,
			}),
		).toBe("dark");
	});

	it("defaults to light when the stored value is invalid and the system is not dark", () => {
		expect(
			resolveInitialTheme({
				storedTheme: "sepia",
				currentTheme: null,
				prefersDark: false,
			}),
		).toBe("light");
	});

	it("updates the document theme and persists the new preference when ThemeToggle is clicked", () => {
		const nextTheme = applyNextTheme(THEMES.light, (theme) => {
			browserSessionStorage.setPreferredTheme(theme);
		});

		expect(nextTheme).toBe(THEMES.dark);
		expect(document.documentElement.dataset.bsTheme).toBe(THEMES.dark);
		expect(browserSessionStorage.getPreferredTheme()).toBe(THEMES.dark);
	});

	it("still updates the document theme when theme persistence storage throws", () => {
		vi.stubGlobal("localStorage", {
			getItem: vi.fn(() => null),
			setItem: vi.fn(() => {
				throw new Error("denied");
			}),
			removeItem: vi.fn(() => undefined),
		});

		expect(() =>
			applyNextTheme(THEMES.light, (theme) => {
				browserSessionStorage.setPreferredTheme(theme);
			}),
		).not.toThrow();
		expect(document.documentElement.dataset.bsTheme).toBe(THEMES.dark);
		expect(browserSessionStorage.getPreferredTheme()).toBeNull();
	});
});

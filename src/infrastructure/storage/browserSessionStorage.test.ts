import { beforeEach, describe, expect, it, vi } from "vitest";
import { browserSessionStorage } from "./browserSessionStorage.js";

describe("browserSessionStorage", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
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

	it("persists the skipped onboarding decision", () => {
		browserSessionStorage.setSkippedBandOnboarding(true);

		expect(browserSessionStorage.getSkippedBandOnboarding()).toBe(true);

		browserSessionStorage.clearSkippedBandOnboarding();

		expect(browserSessionStorage.getSkippedBandOnboarding()).toBe(false);
	});

	it("persists the preferred UI theme", () => {
		browserSessionStorage.setPreferredTheme("dark");

		expect(browserSessionStorage.getPreferredTheme()).toBe("dark");

		browserSessionStorage.clearPreferredTheme();

		expect(browserSessionStorage.getPreferredTheme()).toBeNull();
	});

	it("falls back safely when localStorage access throws", () => {
		vi.stubGlobal("localStorage", {
			getItem: vi.fn(() => {
				throw new Error("denied");
			}),
			setItem: vi.fn(() => {
				throw new Error("denied");
			}),
			removeItem: vi.fn(() => {
				throw new Error("denied");
			}),
		});

		expect(browserSessionStorage.getPreferredTheme()).toBeNull();
		expect(() => browserSessionStorage.setPreferredTheme("dark")).not.toThrow();
		expect(() => browserSessionStorage.clearPreferredTheme()).not.toThrow();
		expect(browserSessionStorage.getSkippedBandOnboarding()).toBe(false);
	});
});

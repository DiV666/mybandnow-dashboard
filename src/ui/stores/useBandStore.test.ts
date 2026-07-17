import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { Band } from "../../domain/band/Band.js";

const { sessionStorage } = vi.hoisted(() => ({
	sessionStorage: {
		getSelectedBandId: vi.fn<() => string | null>(),
		setSelectedBandId: vi.fn<(bandId: string) => void>(),
		clearSelectedBandId: vi.fn<() => void>(),
		getSkippedBandOnboarding: vi.fn<() => boolean>(),
		setSkippedBandOnboarding: vi.fn<(value: boolean) => void>(),
		clearSkippedBandOnboarding: vi.fn<() => void>(),
	},
}));

vi.mock("../../infrastructure/storage/browserSessionStorage.js", () => ({
	browserSessionStorage: sessionStorage,
}));

import { useBandStore } from "./useBandStore.js";

const createBand = (id: string, name: string) =>
	Band.fromPrimitives({ id, name });

describe("useBandStore", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		sessionStorage.getSelectedBandId.mockReset();
		sessionStorage.setSelectedBandId.mockReset();
		sessionStorage.clearSelectedBandId.mockReset();
		sessionStorage.getSkippedBandOnboarding.mockReset();
		sessionStorage.setSkippedBandOnboarding.mockReset();
		sessionStorage.clearSkippedBandOnboarding.mockReset();
	});

	it("hydrates the selected band id from the session storage abstraction", () => {
		sessionStorage.getSelectedBandId.mockReturnValue("band-2");

		const store = useBandStore();

		expect(store.selectedBandId).toBe("band-2");
		expect(sessionStorage.getSelectedBandId).toHaveBeenCalledOnce();
	});

	it("persists band selection changes through the session storage abstraction", () => {
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(false);

		const store = useBandStore();

		store.selectBand("band-1");
		expect(sessionStorage.setSelectedBandId).toHaveBeenCalledWith("band-1");

		store.setBands([createBand("band-2", "Band 2")]);
		expect(sessionStorage.setSelectedBandId).toHaveBeenCalledWith("band-2");

		store.clear();
		expect(sessionStorage.clearSelectedBandId).toHaveBeenCalledTimes(1);
	});

	it("hydrates and persists the skipped onboarding decision", () => {
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(true);

		const store = useBandStore();

		expect(store.hasSkippedBandOnboarding).toBe(true);

		store.skipBandOnboarding();
		expect(sessionStorage.setSkippedBandOnboarding).toHaveBeenCalledWith(true);

		store.clear();
		expect(sessionStorage.clearSkippedBandOnboarding).toHaveBeenCalledTimes(1);
	});

	it("redirects no-band users to create their first band once the dashboard load completes", () => {
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(false);

		const store = useBandStore();

		expect(store.shouldRedirectToCreateFirstBand).toBe(false);

		store.setBands([]);

		expect(store.shouldRedirectToCreateFirstBand).toBe(true);
	});

	it("suppresses the first-band redirect after onboarding was skipped", () => {
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(true);

		const store = useBandStore();

		store.setBands([]);

		expect(store.shouldRedirectToCreateFirstBand).toBe(false);
	});

	it("clears the skipped onboarding flag when bands become available", () => {
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(true);

		const store = useBandStore();

		store.setBands([createBand("band-1", "Band 1")]);

		expect(store.hasSkippedBandOnboarding).toBe(false);
		expect(sessionStorage.clearSkippedBandOnboarding).toHaveBeenCalledOnce();
	});

	it("clears the skipped onboarding state on logout so the next session starts fresh", () => {
		sessionStorage.getSelectedBandId.mockReturnValue(null);
		sessionStorage.getSkippedBandOnboarding.mockReturnValue(true);

		const store = useBandStore();

		store.clear();

		expect(store.hasSkippedBandOnboarding).toBe(false);
		expect(sessionStorage.clearSkippedBandOnboarding).toHaveBeenCalledOnce();

		sessionStorage.getSkippedBandOnboarding.mockReturnValue(false);
		setActivePinia(createPinia());
		const nextSessionStore = useBandStore();

		expect(nextSessionStore.hasSkippedBandOnboarding).toBe(false);
	});
});

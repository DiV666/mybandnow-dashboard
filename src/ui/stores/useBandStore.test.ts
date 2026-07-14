import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { Band } from "../../domain/band/Band.js";

const { sessionStorage } = vi.hoisted(() => ({
	sessionStorage: {
		getSelectedBandId: vi.fn<() => string | null>(),
		setSelectedBandId: vi.fn<(bandId: string) => void>(),
		clearSelectedBandId: vi.fn<() => void>(),
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
	});

	it("hydrates the selected band id from the session storage abstraction", () => {
		sessionStorage.getSelectedBandId.mockReturnValue("band-2");

		const store = useBandStore();

		expect(store.selectedBandId).toBe("band-2");
		expect(sessionStorage.getSelectedBandId).toHaveBeenCalledOnce();
	});

	it("persists band selection changes through the session storage abstraction", () => {
		sessionStorage.getSelectedBandId.mockReturnValue(null);

		const store = useBandStore();

		store.selectBand("band-1");
		expect(sessionStorage.setSelectedBandId).toHaveBeenCalledWith("band-1");

		store.setBands([createBand("band-2", "Band 2")]);
		expect(sessionStorage.setSelectedBandId).toHaveBeenCalledWith("band-2");

		store.clear();
		expect(sessionStorage.clearSelectedBandId).toHaveBeenCalledTimes(1);
	});
});

import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useToastStore } from "./useToastStore.js";

describe("useToastStore", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it("stores default Bootstrap delay metadata for success toasts", () => {
		const store = useToastStore();

		store.success("Canción creada correctamente.");

		expect(store.toasts).toEqual([
			expect.objectContaining({
				variant: "success",
				message: "Canción creada correctamente.",
				durationMs: 5000,
			}),
		]);
	});

	it("preserves a custom Bootstrap delay until the toast is dismissed", () => {
		const store = useToastStore();

		const toastId = store.show({
			message: "Sesión por expirar.",
			variant: "error",
			durationMs: 9000,
		});

		expect(store.toasts).toEqual([
			expect.objectContaining({
				id: toastId,
				variant: "error",
				message: "Sesión por expirar.",
				durationMs: 9000,
			}),
		]);

		store.dismiss(toastId);

		expect(store.toasts).toEqual([]);
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useToastStore } from "./useToastStore.js";

describe("useToastStore", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.useRealTimers();
	});

	it("adds success toasts and auto-dismisses them after the default timeout", () => {
		vi.useFakeTimers();
		const store = useToastStore();

		store.success("Canción creada correctamente.");

		expect(store.toasts).toEqual([
			expect.objectContaining({
				variant: "success",
				message: "Canción creada correctamente.",
			}),
		]);

		vi.advanceTimersByTime(5000);

		expect(store.toasts).toEqual([]);
	});

	it("allows manual dismissal before the timeout expires", () => {
		vi.useFakeTimers();
		const store = useToastStore();

		store.error("Credenciales inválidas");
		const [toast] = store.toasts;

		store.dismiss(toast.id);
		vi.advanceTimersByTime(5000);

		expect(store.toasts).toEqual([]);
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createApp } from "vue";
import { configureErrorHandler } from "./configureErrorHandler.js";
import { useToastStore } from "../stores/useToastStore.js";

describe("configureErrorHandler", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it("shows an error toast and logs the error when an unhandled error is caught", () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const app = createApp({});
		configureErrorHandler(app);
		const toastStore = useToastStore();
		const error = new Error("boom");

		app.config.errorHandler!(error, null, "test-info");

		expect(toastStore.toasts).toEqual([
			expect.objectContaining({
				variant: "error",
			}),
		]);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"[unhandled-error]",
			error.stack,
			"test-info",
		);

		consoleErrorSpy.mockRestore();
	});
});

import { defineStore } from "pinia";
import { ref } from "vue";

export const toastVariants = {
	success: "success",
	error: "error",
} as const;

export type ToastVariant = (typeof toastVariants)[keyof typeof toastVariants];

export interface ToastItem {
	id: number;
	message: string;
	variant: ToastVariant;
}

interface ShowToastOptions {
	message: string;
	variant: ToastVariant;
	durationMs?: number;
}

const DEFAULT_TOAST_DURATION_MS = 5000;

export const useToastStore = defineStore("toast", () => {
	const toasts = ref<ToastItem[]>([]);
	const timers = new Map<number, ReturnType<typeof setTimeout>>();
	let nextToastId = 1;

	function dismiss(toastId: number): void {
		const timer = timers.get(toastId);
		if (timer) {
			clearTimeout(timer);
			timers.delete(toastId);
		}

		toasts.value = toasts.value.filter((toast) => toast.id !== toastId);
	}

	function show({ message, variant, durationMs }: ShowToastOptions): number {
		const toastId = nextToastId++;
		toasts.value = [...toasts.value, { id: toastId, message, variant }];

		const timeoutId = setTimeout(() => {
			dismiss(toastId);
		}, durationMs ?? DEFAULT_TOAST_DURATION_MS);
		timers.set(toastId, timeoutId);

		return toastId;
	}

	function success(message: string): number {
		return show({ message, variant: toastVariants.success });
	}

	function error(message: string): number {
		return show({ message, variant: toastVariants.error });
	}

	function clear(): void {
		for (const timeoutId of timers.values()) {
			clearTimeout(timeoutId);
		}
		timers.clear();
		toasts.value = [];
	}

	return {
		toasts,
		show,
		success,
		error,
		dismiss,
		clear,
	};
});

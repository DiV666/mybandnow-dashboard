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
	durationMs: number;
}

interface ShowToastOptions {
	message: string;
	variant: ToastVariant;
	durationMs?: number;
}

const DEFAULT_TOAST_DURATION_MS = 5000;

export const useToastStore = defineStore("toast", () => {
	const toasts = ref<ToastItem[]>([]);
	let nextToastId = 1;

	function dismiss(toastId: number): void {
		toasts.value = toasts.value.filter((toast) => toast.id !== toastId);
	}

	function show({ message, variant, durationMs }: ShowToastOptions): number {
		const toastId = nextToastId++;
		toasts.value = [
			...toasts.value,
			{
				id: toastId,
				message,
				variant,
				durationMs: durationMs ?? DEFAULT_TOAST_DURATION_MS,
			},
		];

		return toastId;
	}

	function success(message: string): number {
		return show({ message, variant: toastVariants.success });
	}

	function error(message: string): number {
		return show({ message, variant: toastVariants.error });
	}

	function clear(): void {
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

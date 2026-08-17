<script setup lang="ts">
import { Toast } from "bootstrap";
import { computed, onBeforeUnmount } from "vue";
import {
	useToastStore,
	toastVariants,
	type ToastItem,
} from "../stores/useToastStore.js";

const toastStore = useToastStore();
const toastElements = new Map<number, Element>();
const toastInstances = new Map<number, Toast>();
const hiddenListeners = new Map<number, EventListener>();

const toastClassByVariant = computed<Record<string, string>>(() => ({
	[toastVariants.success]: "text-bg-success border-0",
	[toastVariants.error]: "text-bg-danger border-0",
}));

function isAssertiveToast(toast: ToastItem): boolean {
	return toast.variant === toastVariants.error;
}

function accessibilityAttributes(toast: ToastItem): {
	role: "alert" | "status";
	ariaLive: "assertive" | "polite";
} {
	return isAssertiveToast(toast)
		? { role: "alert", ariaLive: "assertive" }
		: { role: "status", ariaLive: "polite" };
}

function cleanupToast(toastId: number): void {
	const element = toastElements.get(toastId);
	const hiddenListener = hiddenListeners.get(toastId);
	if (element && hiddenListener) {
		element.removeEventListener("hidden.bs.toast", hiddenListener);
	}

	hiddenListeners.delete(toastId);
	toastElements.delete(toastId);
	toastInstances.get(toastId)?.dispose();
	toastInstances.delete(toastId);
}

function registerToastElement(toast: ToastItem, element: Element | null): void {
	if (!element) {
		cleanupToast(toast.id);
		return;
	}

	if (toastElements.get(toast.id) === element) {
		return;
	}

	cleanupToast(toast.id);
	toastElements.set(toast.id, element);

	const hiddenListener: EventListener = () => {
		toastStore.dismiss(toast.id);
	};
	const instance = Toast.getOrCreateInstance(element, {
		autohide: true,
		delay: toast.durationMs,
	});

	element.addEventListener("hidden.bs.toast", hiddenListener);
	hiddenListeners.set(toast.id, hiddenListener);
	toastInstances.set(toast.id, instance);
	instance.show();
}

function dismissToast(toastId: number): void {
	const instance = toastInstances.get(toastId);
	if (instance) {
		instance.hide();
		return;
	}

	toastStore.dismiss(toastId);
}

onBeforeUnmount(() => {
	for (const toastId of [...toastInstances.keys()]) {
		cleanupToast(toastId);
	}
});
</script>

<template>
  <div
    data-testid="toast-viewport"
    class="toast-viewport toast-container position-fixed top-0 end-0 p-3"
    aria-live="polite"
    aria-atomic="true"
  >
    <div
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      :ref="(element) => registerToastElement(toast, element as Element | null)"
      class="toast shadow-sm"
      :class="toastClassByVariant[toast.variant]"
      :role="accessibilityAttributes(toast).role"
      :aria-live="accessibilityAttributes(toast).ariaLive"
      aria-atomic="true"
      data-bs-autohide="true"
      :data-bs-delay="toast.durationMs"
    >
      <div class="d-flex align-items-center">
        <div class="toast-body fw-semibold">{{ toast.message }}</div>
        <button
          type="button"
          class="btn-close btn-close-white me-2 m-auto"
          :aria-label="$t('common.toast.dismiss')"
          @click="dismissToast(toast.id)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-viewport {
  z-index: var(--rock-z-toast);
  width: min(100%, 24rem);
}

.toast-body {
  font-size: 1rem;
}
</style>

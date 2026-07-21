<script setup lang="ts">
import { computed } from "vue";
import { useToastStore, toastVariants } from "../stores/useToastStore.js";

const toastStore = useToastStore();

const toastClassByVariant = computed<Record<string, string>>(() => ({
	[toastVariants.success]: "border-success-subtle bg-success-subtle text-success-emphasis",
	[toastVariants.error]: "border-danger-subtle bg-danger-subtle text-danger-emphasis",
}));
</script>

<template>
  <div
    data-testid="toast-viewport"
    class="toast-viewport position-fixed bottom-0 end-0 p-3 d-flex flex-column gap-2"
    aria-live="polite"
    aria-atomic="true"
  >
    <div
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      class="toast-card border rounded-4 shadow-sm px-3 py-2"
      :class="toastClassByVariant[toast.variant]"
      role="alert"
    >
      <div class="d-flex align-items-start gap-3">
        <p class="mb-0 small fw-semibold flex-grow-1">{{ toast.message }}</p>
        <button
          type="button"
          class="btn-close btn-sm"
          aria-label="Descartar notificación"
          @click="toastStore.dismiss(toast.id)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-viewport {
  z-index: 2000;
  width: min(100%, 24rem);
  pointer-events: none;
}

.toast-card {
  pointer-events: auto;
}
</style>

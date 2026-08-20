<script setup lang="ts">
import { computed, ref } from "vue";
import { useBackendStatusStore } from "../stores/useBackendStatusStore.js";
import { useModalFocusTrap } from "../composables/useModalFocusTrap.js";

const backendStatusStore = useBackendStatusStore();
const modalRef = ref<HTMLElement | null>(null);
const isOpen = computed(() => backendStatusStore.isBackendUnavailable);

function closeModal(): void {
	backendStatusStore.clear();
}

function retryConnection(): void {
	backendStatusStore.clear();
}

useModalFocusTrap(modalRef, isOpen, { onEscape: closeModal });
</script>

<template>
  <div
    v-if="backendStatusStore.isBackendUnavailable"
    class="backend-unavailable-modal-backdrop modal-backdrop fade show"
  ></div>

  <div
    v-if="backendStatusStore.isBackendUnavailable"
    ref="modalRef"
    class="backend-unavailable-modal modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="backend-unavailable-title"
  >
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg border-warning">
        <div class="modal-header bg-warning-subtle text-warning-emphasis">
          <h5 id="backend-unavailable-title" class="modal-title">
            <i class="bi bi-wifi-off me-2"></i> {{ $t('components.backendUnavailable.title') }}
          </h5>
        </div>

        <div class="modal-body p-4">
          <p class="mb-3 text-center">
            {{ $t('components.backendUnavailable.message') }}
          </p>
          <p class="text-body-secondary small mb-0 text-center">
            {{ $t('components.backendUnavailable.sessionNotice') }}
          </p>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-outline-secondary"
            data-testid="backend-unavailable-close"
            @click="closeModal"
          >
            {{ $t('components.backendUnavailable.close') }}
          </button>
          <button
            type="button"
            class="btn btn-warning"
            data-testid="backend-unavailable-retry"
            @click="retryConnection"
          >
            {{ $t('components.backendUnavailable.retry') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backend-unavailable-modal-backdrop {
  z-index: var(--rock-z-backend-unavailable-backdrop);
}

.backend-unavailable-modal {
  z-index: var(--rock-z-backend-unavailable-modal);
}
</style>

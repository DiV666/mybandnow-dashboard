<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { container } from '../bootstrap/container.js';
import { useToastStore } from '../stores/useToastStore.js';
import { useModalFocusTrap } from '../composables/useModalFocusTrap.js';
import { isHttpErrorLike } from '../utils/httpError.js';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const toastStore = useToastStore();
const bandName = ref('');
const isLoading = ref(false);
const modalRef = ref<HTMLElement | null>(null);

const { createBandUseCase } = container.useCases;

const isOpen = computed(() => props.open);

function closeModal(): void {
  if (isLoading.value) {
    return;
  }

  emit('close');
}

watch(isOpen, (open) => {
  if (!open) {
    bandName.value = '';
  }
});

useModalFocusTrap(modalRef, isOpen, { onEscape: closeModal });

async function handleCreateBand() {
  if (!bandName.value.trim()) {
    toastStore.error(t('views.createFirstBand.errors.emptyName'));
    return;
  }

  isLoading.value = true;

  try {
    const newBandId = crypto.randomUUID();
    await createBandUseCase.run(newBandId, bandName.value);

    // The dashboard shell already mounted, so we force a refresh to reload bands.
    window.location.href = '/dashboard';
  } catch (error: unknown) {
    if (isHttpErrorLike(error) && error.response?.status === 409) {
      toastStore.error(t('views.createFirstBand.errors.conflict'));
    } else {
      toastStore.error(t('views.createFirstBand.errors.unexpected'));
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div v-if="open" class="create-band-modal-backdrop modal-backdrop fade show"></div>

  <div
    v-if="open"
    ref="modalRef"
    class="create-band-modal modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-band-title"
  >
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg">
        <div class="modal-header">
          <h5 id="create-band-title" class="modal-title">
            {{ $t('views.createFirstBand.createBand') }}
          </h5>
          <button
            type="button"
            class="btn-close"
            :aria-label="$t('views.createFirstBand.close')"
            :disabled="isLoading"
            @click="closeModal"
          ></button>
        </div>

        <div class="modal-body p-4">
          <form @submit.prevent="handleCreateBand">
            <div class="mb-4">
              <label for="bandName" class="form-label fw-bold">{{ $t('views.createFirstBand.bandNameLabel') }}</label>
              <input
                type="text"
                class="form-control"
                id="bandName"
                v-model="bandName"
                :placeholder="$t('views.createFirstBand.bandNamePlaceholder')"
                required
                autofocus
                :disabled="isLoading"
              >
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isLoading ? $t('views.createFirstBand.submitLoading') : $t('views.createFirstBand.submit') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-band-modal-backdrop {
  z-index: var(--rock-z-create-band-backdrop);
}

.create-band-modal {
  z-index: var(--rock-z-create-band-modal);
}
</style>

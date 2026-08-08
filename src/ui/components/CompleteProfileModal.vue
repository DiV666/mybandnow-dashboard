<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMusicianStore } from '../stores/useMusicianStore.js';
import { useToastStore } from '../stores/useToastStore.js';
import { useModalFocusTrap } from '../composables/useModalFocusTrap.js';

interface ErrorLike {
  message?: string;
}

const { t } = useI18n();
const musicianStore = useMusicianStore();
const toastStore = useToastStore();

const name = ref('');
const username = ref('');
const modalRef = ref<HTMLElement | null>(null);
const isOpen = computed(() => musicianStore.isProfileCompletionPending);

useModalFocusTrap(modalRef, isOpen);

// Validación en tiempo real del username: sin espacios, sin caracteres especiales, minúsculas
const sanitizedUsername = computed({
  get: () => username.value,
  set: (val: string) => {
    username.value = val.replace(/[^a-z0-9_]/g, '').toLowerCase();
  }
});

function getErrorMessage(error: unknown): string {
  return typeof error === 'object' && error !== null && 'message' in error
    ? ((error as ErrorLike).message ?? t('components.completeProfile.errors.generic'))
    : t('components.completeProfile.errors.generic');
}

const handleSubmit = async () => {
  if (!name.value.trim() || !username.value.trim()) {
    toastStore.error(t('components.completeProfile.errors.requiredFields'));
    return;
  }

  if (username.value.length < 3) {
    toastStore.error(t('components.completeProfile.errors.usernameTooShort'));
    return;
  }

  try {
    await musicianStore.createProfile(name.value.trim(), username.value);
    // Al acabar el await, isProfileCompletionPending bajará a false y el interceptor original continuará
  } catch (error: unknown) {
    toastStore.error(getErrorMessage(error));
  }
};
</script>

<template>
  <div v-if="musicianStore.isProfileCompletionPending" class="complete-profile-modal-backdrop modal-backdrop fade show"></div>
  
  <div
    v-if="musicianStore.isProfileCompletionPending"
    ref="modalRef"
    class="complete-profile-modal modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="complete-profile-title"
  >
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg border-primary">
        <div class="modal-header bg-primary text-white">
          <h5 id="complete-profile-title" class="modal-title">
            <i class="bi bi-person-badge-fill me-2"></i> {{ $t('components.completeProfile.title') }}
          </h5>
        </div>

        <div class="modal-body p-4">
          <p class="mb-4 text-center">
            {{ $t('components.completeProfile.description') }}
          </p>

          <form @submit.prevent="handleSubmit">
            <div class="mb-3">
              <label for="complete-profile-name" class="form-label fw-bold">{{ $t('components.completeProfile.nameLabel') }}</label>
              <input
                id="complete-profile-name"
                type="text"
                class="form-control"
                v-model="name"
                :placeholder="$t('components.completeProfile.namePlaceholder')"
                required
                autofocus
                :disabled="musicianStore.isLoading"
              >
            </div>

            <div class="mb-4">
              <label for="complete-profile-username" class="form-label fw-bold">{{ $t('components.completeProfile.usernameLabel') }}</label>
              <div class="input-group">
                <span class="input-group-text bg-body-tertiary text-body-secondary">@</span>
                <input
                  id="complete-profile-username"
                  type="text"
                  class="form-control"
                  v-model="sanitizedUsername"
                  :placeholder="$t('components.completeProfile.usernamePlaceholder')"
                  required
                  :disabled="musicianStore.isLoading"
                >
              </div>
              <small class="text-body-secondary d-block mt-1">{{ $t('components.completeProfile.usernameHelp') }}</small>
            </div>

            <div class="d-grid gap-2 mt-4">
              <button type="submit" class="btn btn-primary" :disabled="musicianStore.isLoading">
                <span v-if="musicianStore.isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ $t('components.completeProfile.submit') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.complete-profile-modal-backdrop {
  z-index: var(--rock-z-complete-profile-backdrop);
  background-color: rgba(0, 0, 0, 0.7);
}

.complete-profile-modal {
  z-index: var(--rock-z-complete-profile-modal);
}
</style>

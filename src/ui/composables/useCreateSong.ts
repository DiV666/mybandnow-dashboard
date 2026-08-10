import { computed, ref, type ComputedRef } from 'vue';
import type { Band } from '../../domain/band/Band.js';
import { ValidationError } from '../../domain/shared/ValidationError.js';
import { isHttpErrorLike } from '../utils/httpError.js';
import { useToastStore } from '../stores/useToastStore.js';
import { useI18n } from 'vue-i18n';

interface UseCreateSongUseCases {
  createSongUseCase: {
    run(bandId: string, id: string, title: string, originalVideoclipUrl: string): Promise<void>;
  };
}

interface UseCreateSongOptions extends UseCreateSongUseCases {
  selectedBand: ComputedRef<Band | null>;
  onCreated: (bandId: string) => Promise<void>;
}

/**
 * Manages the create-song modal form state and submission flow, including the 409 conflict
 * and generic error handling for the create-song request.
 */
export function useCreateSong(options: UseCreateSongOptions) {
  const { createSongUseCase, selectedBand, onCreated } = options;
  const { t } = useI18n();
  const toastStore = useToastStore();

  const title = ref('');
  const originalVideoclipUrl = ref('');
  const errorMsg = ref('');
  const isCreateSongModalOpen = ref(false);
  const isLoading = ref(false);

  const canSubmit = computed(() => !isLoading.value && selectedBand.value !== null);

  function showErrorToast(message: string): void {
    toastStore.error(message);
  }

  function showSuccessToast(message: string): void {
    toastStore.success(message);
  }

  function resetCreateSongForm(): void {
    title.value = '';
    originalVideoclipUrl.value = '';
    errorMsg.value = '';
  }

  function openCreateSongModal(): void {
    if (!selectedBand.value || isLoading.value) {
      return;
    }

    errorMsg.value = '';
    isCreateSongModalOpen.value = true;
  }

  function closeCreateSongModal(): void {
    isCreateSongModalOpen.value = false;
    resetCreateSongForm();
  }

  async function handleCreateSong(): Promise<void> {
    errorMsg.value = '';

    if (!selectedBand.value) {
      errorMsg.value = t('dashboard.songs.errors.selectBandBeforeCreate');
      showErrorToast(errorMsg.value);
      return;
    }

    isLoading.value = true;

    try {
      const bandId = selectedBand.value.id.value;
      await createSongUseCase.run(bandId, crypto.randomUUID(), title.value, originalVideoclipUrl.value);

      resetCreateSongForm();
      isCreateSongModalOpen.value = false;
      showSuccessToast(t('dashboard.songs.success.songCreated'));
      if (selectedBand.value?.id.value === bandId) {
        await onCreated(bandId);
      }
    } catch (error: unknown) {
      if (isHttpErrorLike(error) && error.response?.status === 409) {
        errorMsg.value = t('dashboard.songs.errors.songConflict');
      } else if (error instanceof ValidationError) {
        errorMsg.value = error.message;
      } else {
        console.error(error);
        errorMsg.value = t('dashboard.songs.errors.createSongUnexpected');
      }
      showErrorToast(errorMsg.value);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    title,
    originalVideoclipUrl,
    errorMsg,
    isCreateSongModalOpen,
    isLoading,
    canSubmit,
    resetCreateSongForm,
    openCreateSongModal,
    closeCreateSongModal,
    handleCreateSong,
  };
}

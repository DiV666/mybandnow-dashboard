import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToastStore } from '../stores/useToastStore.js';
import { isHttpErrorLike } from '../utils/httpError.js';

interface UseRequestSongVideoclipUseCases {
  requestSongVideoclipUseCase: { run(songId: string): Promise<void> };
}

/**
 * Manages the per-song videoclip generation request, tracking in-flight state and mapping the
 * upload-validation, permission, and not-found errors returned by the videoclip endpoint.
 */
export function useRequestSongVideoclip(deps: UseRequestSongVideoclipUseCases) {
  const { requestSongVideoclipUseCase } = deps;
  const { t } = useI18n();
  const toastStore = useToastStore();

  const requestingVideoclipSongIds = ref<Record<string, boolean>>({});

  function isRequestingVideoclip(songId: string): boolean {
    return requestingVideoclipSongIds.value[songId] === true;
  }

  async function requestSongVideoclip(songId: string): Promise<void> {
    if (isRequestingVideoclip(songId)) {
      return;
    }

    requestingVideoclipSongIds.value = { ...requestingVideoclipSongIds.value, [songId]: true };

    try {
      await requestSongVideoclipUseCase.run(songId);
      toastStore.success(t('dashboard.songs.success.videoclipRequested'));
    } catch (error: unknown) {
      let message: string;

      if (
        isHttpErrorLike(error) &&
        (error.response?.status === 400 || error.response?.status === 409)
      ) {
        message = t('dashboard.songs.errors.videoclipMissingUploads');
      } else if (
        isHttpErrorLike(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        message = t('dashboard.songs.errors.noPermissionVideoclip');
      } else if (isHttpErrorLike(error) && error.response?.status === 404) {
        message = t('dashboard.songs.errors.videoclipSongNotFound');
      } else {
        console.error(error);
        message = t('dashboard.songs.errors.videoclipUnexpected');
      }

      toastStore.error(message);
    } finally {
      requestingVideoclipSongIds.value = { ...requestingVideoclipSongIds.value, [songId]: false };
    }
  }

  return {
    isRequestingVideoclip,
    requestSongVideoclip,
  };
}

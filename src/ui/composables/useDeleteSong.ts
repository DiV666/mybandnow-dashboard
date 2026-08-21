import { computed, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SongResponse } from '../../domain/song/SongResponse.js';
import { useToastStore } from '../stores/useToastStore.js';
import type { UploadErrorDetails } from './useSongInstrumentUpload.js';

export interface DeleteSongModalState {
  songId: string;
  isSubmitting: boolean;
  errorMsg: string;
}

interface UseDeleteSongUseCases {
  deleteSongUseCase: {
    run(songId: string): Promise<void>;
  };
}

interface UseDeleteSongDeps extends UseDeleteSongUseCases {
  songs: Ref<SongResponse[]>;
  extractUploadErrorDetails: (error: unknown) => UploadErrorDetails;
}

/**
 * Owns the delete song confirmation modal, removing the song from the local list on success.
 */
export function useDeleteSong(deps: UseDeleteSongDeps) {
  const { deleteSongUseCase, songs, extractUploadErrorDetails } = deps;
  const { t } = useI18n();
  const toastStore = useToastStore();

  const activeDeleteSongModal = ref<DeleteSongModalState | null>(null);
  const deleteSongModalRef = ref<HTMLElement | null>(null);

  const activeDeleteSongModalContext = computed(() => {
    if (!activeDeleteSongModal.value) {
      return null;
    }

    const song = songs.value.find(
      (candidate) => candidate.id === activeDeleteSongModal.value?.songId,
    );
    if (!song) {
      return null;
    }

    return { song };
  });

  function isDeleteSongModalActive(songId: string): boolean {
    return activeDeleteSongModal.value?.songId === songId;
  }

  function mapDeleteSongErrorMessage(details: UploadErrorDetails): string {
    if (details.status === 401 || details.status === 403) {
      return t('dashboard.songs.errors.noPermissionDeleteSong');
    }

    if (details.status === 404) {
      return t('dashboard.songs.errors.songNotFoundForDelete');
    }

    return t('dashboard.songs.errors.deleteSongUnexpected');
  }

  function openDeleteSongModal(songId: string): void {
    if (!songId || !songs.value.some((candidate) => candidate.id === songId)) {
      return;
    }

    activeDeleteSongModal.value = {
      songId,
      isSubmitting: false,
      errorMsg: '',
    };
  }

  function closeDeleteSongModal(): void {
    activeDeleteSongModal.value = null;
  }

  async function handleDeleteSongSubmit(): Promise<void> {
    if (!activeDeleteSongModal.value) {
      return;
    }

    const modalState = activeDeleteSongModal.value;
    activeDeleteSongModal.value = {
      ...modalState,
      isSubmitting: true,
      errorMsg: '',
    };

    try {
      await deleteSongUseCase.run(modalState.songId);
      songs.value = songs.value.filter((song) => song.id !== modalState.songId);

      if (isDeleteSongModalActive(modalState.songId)) {
        toastStore.success(t('dashboard.songs.success.songDeleted'));
        closeDeleteSongModal();
      }
    } catch (error: unknown) {
      if (!isDeleteSongModalActive(modalState.songId)) {
        return;
      }

      const message = mapDeleteSongErrorMessage(extractUploadErrorDetails(error));
      activeDeleteSongModal.value = {
        ...activeDeleteSongModal.value,
        isSubmitting: false,
        errorMsg: message,
      };
      toastStore.error(message);
    }
  }

  return {
    activeDeleteSongModal,
    deleteSongModalRef,
    activeDeleteSongModalContext,
    openDeleteSongModal,
    closeDeleteSongModal,
    handleDeleteSongSubmit,
  };
}

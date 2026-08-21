import { computed, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SongInstrumentListItemResponse } from '../../domain/song/SongInstrumentResponse.js';
import type { SongResponse } from '../../domain/song/SongResponse.js';
import { useToastStore } from '../stores/useToastStore.js';
import type { UploadErrorDetails } from './useSongInstrumentUpload.js';

export interface DeleteInstrumentModalState {
  songId: string;
  instrumentId: string;
  isSubmitting: boolean;
  errorMsg: string;
}

interface UseDeleteSongInstrumentUseCases {
  deleteSongInstrumentUseCase: {
    run(songId: string, instrumentId: string): Promise<void>;
  };
}

interface UseDeleteSongInstrumentDeps extends UseDeleteSongInstrumentUseCases {
  songs: Ref<SongResponse[]>;
  songInstruments: Ref<Record<string, SongInstrumentListItemResponse[]>>;
  getSongInstrument: (
    songId: string,
    instrumentId: string,
  ) => SongInstrumentListItemResponse | null;
  extractUploadErrorDetails: (error: unknown) => UploadErrorDetails;
}

/**
 * Owns the delete song instrument confirmation modal: only a band's creator is allowed to
 * delete an instrument, enforced by the backend and surfaced here as a 403 error message.
 */
export function useDeleteSongInstrument(deps: UseDeleteSongInstrumentDeps) {
  const {
    deleteSongInstrumentUseCase,
    songs,
    songInstruments,
    getSongInstrument,
    extractUploadErrorDetails,
  } = deps;
  const { t } = useI18n();
  const toastStore = useToastStore();

  const activeDeleteInstrumentModal = ref<DeleteInstrumentModalState | null>(null);
  const deleteInstrumentModalRef = ref<HTMLElement | null>(null);

  const activeDeleteInstrumentModalContext = computed(() => {
    if (!activeDeleteInstrumentModal.value) {
      return null;
    }

    const song = songs.value.find(
      (candidate) => candidate.id === activeDeleteInstrumentModal.value?.songId,
    );
    if (!song) {
      return null;
    }

    const instrument = getSongInstrument(
      activeDeleteInstrumentModal.value.songId,
      activeDeleteInstrumentModal.value.instrumentId,
    );
    if (!instrument) {
      return null;
    }

    return {
      song,
      instrument,
    };
  });

  function isDeleteInstrumentModalActive(songId: string, instrumentId: string): boolean {
    return (
      activeDeleteInstrumentModal.value?.songId === songId &&
      activeDeleteInstrumentModal.value?.instrumentId === instrumentId
    );
  }

  function mapDeleteInstrumentErrorMessage(details: UploadErrorDetails): string {
    if (details.status === 401 || details.status === 403) {
      return t('dashboard.songs.errors.noPermissionDeleteInstrument');
    }

    if (details.status === 404) {
      return t('dashboard.songs.errors.instrumentNotFoundForDelete');
    }

    return t('dashboard.songs.errors.deleteInstrumentUnexpected');
  }

  function openDeleteInstrumentModal(songId: string, instrumentId: string): void {
    if (!songId || !instrumentId || !getSongInstrument(songId, instrumentId)) {
      return;
    }

    activeDeleteInstrumentModal.value = {
      songId,
      instrumentId,
      isSubmitting: false,
      errorMsg: '',
    };
  }

  function closeDeleteInstrumentModal(): void {
    activeDeleteInstrumentModal.value = null;
  }

  async function handleDeleteInstrumentSubmit(): Promise<void> {
    if (!activeDeleteInstrumentModal.value) {
      return;
    }

    const modalState = activeDeleteInstrumentModal.value;
    activeDeleteInstrumentModal.value = {
      ...modalState,
      isSubmitting: true,
      errorMsg: '',
    };

    try {
      await deleteSongInstrumentUseCase.run(modalState.songId, modalState.instrumentId);
      songInstruments.value = {
        ...songInstruments.value,
        [modalState.songId]: (songInstruments.value[modalState.songId] ?? []).filter(
          (instrument) => instrument.id !== modalState.instrumentId,
        ),
      };

      if (isDeleteInstrumentModalActive(modalState.songId, modalState.instrumentId)) {
        toastStore.success(t('dashboard.songs.success.instrumentDeleted'));
        closeDeleteInstrumentModal();
      }
    } catch (error: unknown) {
      if (!isDeleteInstrumentModalActive(modalState.songId, modalState.instrumentId)) {
        return;
      }

      const message = mapDeleteInstrumentErrorMessage(extractUploadErrorDetails(error));
      activeDeleteInstrumentModal.value = {
        ...activeDeleteInstrumentModal.value,
        isSubmitting: false,
        errorMsg: message,
      };
      toastStore.error(message);
    }
  }

  return {
    activeDeleteInstrumentModal,
    deleteInstrumentModalRef,
    activeDeleteInstrumentModalContext,
    openDeleteInstrumentModal,
    closeDeleteInstrumentModal,
    handleDeleteInstrumentSubmit,
  };
}

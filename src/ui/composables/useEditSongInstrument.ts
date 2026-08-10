import { computed, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type {
  SongInstrumentDetailResponse,
  SongInstrumentListItemResponse,
} from '../../domain/song/SongInstrumentResponse.js';
import type { SongResponse } from '../../domain/song/SongResponse.js';
import { useToastStore } from '../stores/useToastStore.js';
import type { UploadErrorDetails } from './useSongInstrumentUpload.js';

export interface EditInstrumentModalState {
  songId: string;
  instrumentId: string;
  name: string;
  catalogInstrumentId: string;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMsg: string;
}

interface TextInputLike {
  value?: string;
}

interface UseEditSongInstrumentUseCases {
  getSongInstrumentDetailUseCase: {
    run(songId: string, instrumentId: string): Promise<SongInstrumentDetailResponse>;
  };
  updateSongInstrumentUseCase: {
    run(
      songId: string,
      instrumentId: string,
      name: string,
      catalogInstrumentId: string,
    ): Promise<SongInstrumentDetailResponse>;
  };
}

interface UseEditSongInstrumentDeps extends UseEditSongInstrumentUseCases {
  songs: Ref<SongResponse[]>;
  getSongInstrument: (
    songId: string,
    instrumentId: string,
  ) => SongInstrumentListItemResponse | null;
  setSongInstrumentDetail: (detail: SongInstrumentDetailResponse) => void;
  getSongInstrumentCatalogId: (
    instrument: SongInstrumentListItemResponse | SongInstrumentDetailResponse,
  ) => string;
  ensureCatalogInstrumentNameLoaded: (instrumentId: string) => Promise<void>;
  ensureAvailableInstrumentsLoaded: () => Promise<void>;
  extractUploadErrorDetails: (error: unknown) => UploadErrorDetails;
}

/**
 * Owns the edit song instrument modal: loading its detail, submitting name/catalog updates.
 */
export function useEditSongInstrument(deps: UseEditSongInstrumentDeps) {
  const {
    getSongInstrumentDetailUseCase,
    updateSongInstrumentUseCase,
    songs,
    getSongInstrument,
    setSongInstrumentDetail,
    getSongInstrumentCatalogId,
    ensureCatalogInstrumentNameLoaded,
    ensureAvailableInstrumentsLoaded,
    extractUploadErrorDetails,
  } = deps;
  const { t } = useI18n();
  const toastStore = useToastStore();

  const activeEditInstrumentModal = ref<EditInstrumentModalState | null>(null);
  const editInstrumentModalRef = ref<HTMLElement | null>(null);

  function showErrorToast(message: string): void {
    toastStore.error(message);
  }

  function showSuccessToast(message: string): void {
    toastStore.success(message);
  }

  const activeEditInstrumentModalContext = computed(() => {
    if (!activeEditInstrumentModal.value) {
      return null;
    }

    const song = songs.value.find(
      (candidate) => candidate.id === activeEditInstrumentModal.value?.songId,
    );
    if (!song) {
      return null;
    }

    const instrument = getSongInstrument(
      activeEditInstrumentModal.value.songId,
      activeEditInstrumentModal.value.instrumentId,
    );
    if (!instrument) {
      return null;
    }

    return {
      song,
      instrument,
    };
  });

  function isEditInstrumentModalActive(songId: string, instrumentId: string): boolean {
    return (
      activeEditInstrumentModal.value?.songId === songId &&
      activeEditInstrumentModal.value?.instrumentId === instrumentId
    );
  }

  function mapEditInstrumentErrorMessage(details: UploadErrorDetails): string {
    const message = details.message?.toLowerCase() ?? '';
    const code = details.code?.toLowerCase() ?? '';
    const combined = `${code} ${message}`;

    if (details.status === 401 || details.status === 403) {
      return t('dashboard.songs.errors.noPermissionEditInstrument');
    }

    if (details.status === 404 || combined.includes('instrument_not_exists')) {
      return t('dashboard.songs.errors.instrumentNotFoundForEdit');
    }

    if (combined.includes('songinstrumentname cannot be empty')) {
      return t('dashboard.songs.errors.emptyInstrumentName');
    }

    if (combined.includes('instrumentid cannot be empty')) {
      return t('dashboard.songs.errors.selectInstrumentFirst');
    }

    if (details.status === 400) {
      return t('dashboard.songs.errors.updateInstrumentFailed');
    }

    return t('dashboard.songs.errors.updateInstrumentUnexpected');
  }

  function setActiveEditInstrumentModal(updates: Partial<EditInstrumentModalState>): void {
    if (!activeEditInstrumentModal.value) {
      return;
    }

    activeEditInstrumentModal.value = {
      ...activeEditInstrumentModal.value,
      ...updates,
    };
  }

  async function loadEditInstrumentModalDetail(
    songId: string,
    instrumentId: string,
  ): Promise<void> {
    try {
      const detail = await getSongInstrumentDetailUseCase.run(songId, instrumentId);
      if (!isEditInstrumentModalActive(songId, instrumentId)) {
        return;
      }

      setSongInstrumentDetail(detail);
      setActiveEditInstrumentModal({
        name: detail.name,
        catalogInstrumentId: getSongInstrumentCatalogId(detail),
        isLoading: false,
        errorMsg: '',
      });
    } catch {
      if (!isEditInstrumentModalActive(songId, instrumentId)) {
        return;
      }

      const message = t('dashboard.songs.errors.loadInstrumentDetailFailed');
      setActiveEditInstrumentModal({
        isLoading: false,
        errorMsg: message,
      });
      showErrorToast(message);
    }
  }

  function openEditInstrumentModal(songId: string, instrumentId: string): void {
    const instrument = getSongInstrument(songId, instrumentId);
    if (!instrument || !songId || !instrumentId) {
      return;
    }

    const catalogInstrumentId = getSongInstrumentCatalogId(instrument);
    activeEditInstrumentModal.value = {
      songId,
      instrumentId,
      catalogInstrumentId,
      name: instrument.name,
      isLoading: catalogInstrumentId.length === 0,
      isSubmitting: false,
      errorMsg: '',
    };
    void ensureAvailableInstrumentsLoaded();
    if (catalogInstrumentId.length === 0) {
      void loadEditInstrumentModalDetail(songId, instrumentId);
    }
  }

  function closeEditInstrumentModal(): void {
    activeEditInstrumentModal.value = null;
  }

  function handleEditInstrumentNameInput(event: Event): void {
    const target = event.target;
    const nextValue =
      target && typeof target === 'object' && 'value' in target
        ? ((target as TextInputLike).value ?? '')
        : '';
    setActiveEditInstrumentModal({
      name: nextValue,
      errorMsg: '',
    });
  }

  function handleEditInstrumentCatalogInput(event: Event): void {
    const target = event.target;
    const nextValue =
      target && typeof target === 'object' && 'value' in target
        ? ((target as TextInputLike).value ?? '')
        : '';
    setActiveEditInstrumentModal({
      catalogInstrumentId: nextValue,
      errorMsg: '',
    });
  }

  async function handleEditInstrumentSubmit(): Promise<void> {
    if (!activeEditInstrumentModal.value) {
      return;
    }

    const modalState = activeEditInstrumentModal.value;
    const trimmedName = modalState.name.trim();

    if (!modalState.songId || !modalState.instrumentId) {
      const message = t('dashboard.songs.errors.instrumentNotFoundForEditAlt');
      setActiveEditInstrumentModal({
        errorMsg: message,
      });
      showErrorToast(message);
      return;
    }

    if (!modalState.catalogInstrumentId) {
      const message = t('dashboard.songs.errors.selectInstrumentFirst');
      setActiveEditInstrumentModal({
        errorMsg: message,
      });
      showErrorToast(message);
      return;
    }

    if (!trimmedName) {
      const message = t('dashboard.songs.errors.emptyInstrumentName');
      setActiveEditInstrumentModal({
        errorMsg: message,
      });
      showErrorToast(message);
      return;
    }

    setActiveEditInstrumentModal({
      isSubmitting: true,
      errorMsg: '',
    });

    try {
      const updatedInstrument = await updateSongInstrumentUseCase.run(
        modalState.songId,
        modalState.instrumentId,
        trimmedName,
        modalState.catalogInstrumentId,
      );
      if (!isEditInstrumentModalActive(modalState.songId, modalState.instrumentId)) {
        return;
      }

      setSongInstrumentDetail(updatedInstrument);
      if (updatedInstrument.instrumentId) {
        try {
          await ensureCatalogInstrumentNameLoaded(updatedInstrument.instrumentId);
        } catch {
          // Catalog name resolution must not break the song instrument flow.
        }
      }
      showSuccessToast(t('dashboard.songs.success.instrumentUpdated'));
      closeEditInstrumentModal();
    } catch (error: unknown) {
      if (!isEditInstrumentModalActive(modalState.songId, modalState.instrumentId)) {
        return;
      }

      const message = mapEditInstrumentErrorMessage(extractUploadErrorDetails(error));
      setActiveEditInstrumentModal({
        isSubmitting: false,
        errorMsg: message,
      });
      showErrorToast(message);
    }
  }

  return {
    activeEditInstrumentModal,
    editInstrumentModalRef,
    activeEditInstrumentModalContext,
    openEditInstrumentModal,
    closeEditInstrumentModal,
    handleEditInstrumentNameInput,
    handleEditInstrumentCatalogInput,
    handleEditInstrumentSubmit,
  };
}

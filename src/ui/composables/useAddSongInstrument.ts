import { computed, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SongInstrumentListItemResponse } from '../../domain/song/SongInstrumentResponse.js';
import type { SongResponse } from '../../domain/song/SongResponse.js';
import { ValidationError } from '../../domain/shared/ValidationError.js';
import { useMusicianStore } from '../stores/useMusicianStore.js';
import { useToastStore } from '../stores/useToastStore.js';
import { isHttpErrorLike } from '../utils/httpError.js';

export interface SongInstrumentFormState {
  isVisible: boolean;
  name: string;
  instrumentId: string;
  isSubmitting: boolean;
  errorMsg: string;
}

type SongInstrumentFormMap = Record<string, SongInstrumentFormState>;
type SongInstrumentMap = Record<string, SongInstrumentListItemResponse[]>;

interface UseAddSongInstrumentUseCases {
  createSongInstrumentUseCase: {
    run(
      songId: string,
      id: string,
      name: string,
      instrumentId: string,
      musicianId: string,
    ): Promise<void>;
  };
  getSongInstrumentsUseCase: { run(songId: string): Promise<SongInstrumentListItemResponse[]> };
}

interface UseAddSongInstrumentDeps extends UseAddSongInstrumentUseCases {
  songs: Ref<SongResponse[]>;
  songInstruments: Ref<SongInstrumentMap>;
  ensureAvailableInstrumentsLoaded: () => Promise<void>;
  preloadCatalogInstrumentNames: (instruments: SongInstrumentListItemResponse[]) => Promise<void>;
  syncSongInstrumentAsyncState: (
    songId: string,
    instrument: SongInstrumentListItemResponse,
  ) => Promise<void>;
}

/**
 * Manages the create-song-instrument form state and submission flow, including the 409/403
 * error handling and the generic error fallback for the add-instrument request.
 */
export function useAddSongInstrument(deps: UseAddSongInstrumentDeps) {
  const {
    createSongInstrumentUseCase,
    getSongInstrumentsUseCase,
    songs,
    songInstruments,
    ensureAvailableInstrumentsLoaded,
    preloadCatalogInstrumentNames,
    syncSongInstrumentAsyncState,
  } = deps;
  const { t } = useI18n();
  const musicianStore = useMusicianStore();
  const toastStore = useToastStore();

  const songInstrumentForms = ref<SongInstrumentFormMap>({});
  const songInstrumentFormModalRef = ref<HTMLElement | null>(null);

  const activeSongInstrumentFormSong = computed(
    () => songs.value.find((song) => songInstrumentForms.value[song.id]?.isVisible) ?? null,
  );

  function showErrorToast(message: string): void {
    toastStore.error(message);
  }

  function showSuccessToast(message: string): void {
    toastStore.success(message);
  }

  function getSongInstrumentForm(songId: string): SongInstrumentFormState {
    const current = songInstrumentForms.value[songId];
    if (current) {
      return current;
    }

    const nextState: SongInstrumentFormState = {
      isVisible: false,
      name: '',
      instrumentId: '',
      isSubmitting: false,
      errorMsg: '',
    };
    songInstrumentForms.value = {
      ...songInstrumentForms.value,
      [songId]: nextState,
    };
    return nextState;
  }

  function hasSongInstrumentForm(songId: string): boolean {
    return songId in songInstrumentForms.value;
  }

  function setSongInstrumentForm(songId: string, updates: Partial<SongInstrumentFormState>): void {
    const current = getSongInstrumentForm(songId);
    songInstrumentForms.value = {
      ...songInstrumentForms.value,
      [songId]: {
        ...current,
        ...updates,
      },
    };
  }

  function openSongInstrumentForm(songId: string): void {
    void ensureAvailableInstrumentsLoaded();
    songInstrumentForms.value = Object.fromEntries(
      Object.entries(songInstrumentForms.value).map(([currentSongId, formState]) => [
        currentSongId,
        {
          ...formState,
          isVisible: currentSongId === songId,
          errorMsg: currentSongId === songId ? '' : formState.errorMsg,
        },
      ]),
    ) as SongInstrumentFormMap;

    if (!songInstrumentForms.value[songId]) {
      setSongInstrumentForm(songId, {
        isVisible: true,
        errorMsg: '',
      });
    }
  }

  function closeSongInstrumentForm(songId: string): void {
    setSongInstrumentForm(songId, {
      isVisible: false,
      errorMsg: '',
    });
  }

  async function handleCreateSongInstrument(songId: string): Promise<void> {
    const musicianProfileId = musicianStore.profile?.id;
    if (!musicianProfileId) {
      const message = t('dashboard.songs.errors.profileRequiredForInstrument');
      setSongInstrumentForm(songId, {
        errorMsg: message,
      });
      showErrorToast(message);
      return;
    }

    const form = getSongInstrumentForm(songId);
    setSongInstrumentForm(songId, {
      isSubmitting: true,
      errorMsg: '',
    });

    try {
      await createSongInstrumentUseCase.run(
        songId,
        crypto.randomUUID(),
        form.name,
        form.instrumentId,
        musicianProfileId,
      );
      const instruments = await getSongInstrumentsUseCase.run(songId);
      songInstruments.value = {
        ...songInstruments.value,
        [songId]: instruments,
      };
      await preloadCatalogInstrumentNames(instruments);
      await Promise.all(
        instruments.map((instrument) => syncSongInstrumentAsyncState(songId, instrument)),
      );
      setSongInstrumentForm(songId, {
        isVisible: false,
        name: '',
        instrumentId: '',
        isSubmitting: false,
      });
      showSuccessToast(t('dashboard.songs.success.instrumentAdded'));
    } catch (error: unknown) {
      if (isHttpErrorLike(error) && error.response?.status === 409) {
        const message = t('dashboard.songs.errors.instrumentConflict');
        setSongInstrumentForm(songId, {
          errorMsg: message,
          isSubmitting: false,
        });
        showErrorToast(message);
        return;
      }

      if (isHttpErrorLike(error) && error.response?.status === 403) {
        const message = t('dashboard.songs.errors.noPermissionAddInstrument');
        setSongInstrumentForm(songId, {
          errorMsg: message,
          isSubmitting: false,
        });
        showErrorToast(message);
        return;
      }

      const message =
        error instanceof ValidationError
          ? error.message
          : (() => {
              console.error(error);
              return t('dashboard.songs.errors.addInstrumentUnexpected');
            })();
      setSongInstrumentForm(songId, {
        errorMsg: message,
        isSubmitting: false,
      });
      showErrorToast(message);
    } finally {
      if (hasSongInstrumentForm(songId) && getSongInstrumentForm(songId).isSubmitting) {
        setSongInstrumentForm(songId, {
          isSubmitting: false,
        });
      }
    }
  }

  return {
    songInstrumentForms,
    songInstrumentFormModalRef,
    activeSongInstrumentFormSong,
    getSongInstrumentForm,
    hasSongInstrumentForm,
    openSongInstrumentForm,
    closeSongInstrumentForm,
    handleCreateSongInstrument,
  };
}

import { computed, onBeforeUnmount, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  songInstrumentUploadStatuses,
  type SongInstrumentDetailResponse,
  type SongInstrumentListItemResponse,
  type SongInstrumentUploadResponse,
  type SongInstrumentVideoResponse,
} from '../../domain/song/SongInstrumentResponse.js';
import type { SongResponse } from '../../domain/song/SongResponse.js';
import { useToastStore } from '../stores/useToastStore.js';
import { isHttpErrorLike } from '../utils/httpError.js';

const songInstrumentUploadProgressStages = {
  IDLE: 'IDLE',
  REQUEST: 'REQUEST',
  BACKEND: 'BACKEND',
  COMPLETE: 'COMPLETE',
} as const;

type SongInstrumentUploadProgressStage =
  (typeof songInstrumentUploadProgressStages)[keyof typeof songInstrumentUploadProgressStages];

const SONG_INSTRUMENT_POLL_INTERVAL_MS = 5000;
const SONG_INSTRUMENT_PROGRESS_TICK_MS = 400;

export interface SongInstrumentUploadState {
  selectedFile: File | null;
  isSubmitting: boolean;
  successMsg: string;
  errorMsg: string;
  progress: number;
  progressStage: SongInstrumentUploadProgressStage;
}

interface ActiveSongInstrumentUploadModalState {
  songId: string;
  instrumentId: string;
}

interface FileInputLike {
  files?: FileList | File[] | null;
}

export interface UploadErrorDetails {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

type SongInstrumentMap = Record<string, SongInstrumentListItemResponse[]>;
type SongInstrumentUploadMap = Record<string, SongInstrumentUploadState>;

interface UseSongInstrumentUploadUseCases {
  uploadSongInstrumentVideoUseCase: {
    run(songId: string, instrumentId: string, videoFile: File): Promise<void>;
  };
}

interface UseSongInstrumentUploadDeps extends UseSongInstrumentUploadUseCases {
  songs: Ref<SongResponse[]>;
  songInstruments: Ref<SongInstrumentMap>;
  refreshSongInstrumentDetail: (
    songId: string,
    instrumentId: string,
  ) => Promise<SongInstrumentDetailResponse>;
  getEffectiveUpload: (
    songId: string,
    instrument: SongInstrumentListItemResponse,
  ) => SongInstrumentUploadResponse | null;
  getEffectiveVideo: (
    songId: string,
    instrumentId: string,
  ) => SongInstrumentVideoResponse | null;
  getSongInstrument: (
    songId: string,
    instrumentId: string,
  ) => SongInstrumentListItemResponse | null;
  isSongInstrumentInProgress: (upload: SongInstrumentUploadResponse | null) => boolean;
}

/**
 * Owns the song instrument video upload flow: form state, request/backend progress simulation
 * and the status polling that follows an upload until the transcoded video becomes available.
 */
export function useSongInstrumentUpload(deps: UseSongInstrumentUploadDeps) {
  const {
    uploadSongInstrumentVideoUseCase,
    songs,
    songInstruments,
    refreshSongInstrumentDetail,
    getEffectiveUpload,
    getEffectiveVideo,
    getSongInstrument,
    isSongInstrumentInProgress,
  } = deps;
  const { t } = useI18n();
  const toastStore = useToastStore();

  const songInstrumentUploads = ref<SongInstrumentUploadMap>({});
  const songInstrumentUploadModalRef = ref<HTMLElement | null>(null);
  const activeSongInstrumentUploadModal =
    ref<ActiveSongInstrumentUploadModalState | null>(null);

  const songInstrumentPollTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  const songInstrumentProgressTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  const songInstrumentPollVersions = new Map<string, number>();

  let isComposableMounted = true;

  onBeforeUnmount(() => {
    isComposableMounted = false;
  });

  function showErrorToast(message: string): void {
    toastStore.error(message);
  }

  const activeSongInstrumentUploadModalContext = computed(() => {
    if (!activeSongInstrumentUploadModal.value) {
      return null;
    }

    const song = songs.value.find(
      (candidate) => candidate.id === activeSongInstrumentUploadModal.value?.songId,
    );
    if (!song) {
      return null;
    }

    const instrument = getSongInstrument(
      activeSongInstrumentUploadModal.value.songId,
      activeSongInstrumentUploadModal.value.instrumentId,
    );
    if (!instrument) {
      return null;
    }

    return {
      song,
      instrument,
    };
  });

  function getSongInstrumentUploadKey(songId: string, instrumentId: string): string {
    return `${songId}:${instrumentId}`;
  }

  function getSongInstrumentUploadState(
    songId: string,
    instrumentId: string,
  ): SongInstrumentUploadState {
    const key = getSongInstrumentUploadKey(songId, instrumentId);
    const current = songInstrumentUploads.value[key];
    if (current) {
      return current;
    }

    const nextState: SongInstrumentUploadState = {
      selectedFile: null,
      isSubmitting: false,
      successMsg: '',
      errorMsg: '',
      progress: 0,
      progressStage: songInstrumentUploadProgressStages.IDLE,
    };
    songInstrumentUploads.value = {
      ...songInstrumentUploads.value,
      [key]: nextState,
    };
    return nextState;
  }

  function setSongInstrumentUploadState(
    songId: string,
    instrumentId: string,
    updates: Partial<SongInstrumentUploadState>,
  ): void {
    const key = getSongInstrumentUploadKey(songId, instrumentId);
    const current = getSongInstrumentUploadState(songId, instrumentId);
    songInstrumentUploads.value = {
      ...songInstrumentUploads.value,
      [key]: {
        ...current,
        ...updates,
      },
    };
  }

  function setSongInstrumentUploadStatus(
    songId: string,
    instrumentId: string,
    upload: SongInstrumentUploadResponse | null,
  ): void {
    const instruments = songInstruments.value[songId] ?? [];
    songInstruments.value = {
      ...songInstruments.value,
      [songId]: instruments.map((instrument) =>
        instrument.id === instrumentId
          ? {
              ...instrument,
              upload,
            }
          : instrument,
      ),
    };
  }

  function clearSongInstrumentProgressTimer(songId: string, instrumentId: string): void {
    const key = getSongInstrumentUploadKey(songId, instrumentId);
    const timeoutId = songInstrumentProgressTimeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      songInstrumentProgressTimeouts.delete(key);
    }
  }

  function cancelSongInstrumentPoll(songId: string, instrumentId: string): void {
    const key = getSongInstrumentUploadKey(songId, instrumentId);
    const timeoutId = songInstrumentPollTimeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      songInstrumentPollTimeouts.delete(key);
    }
    songInstrumentPollVersions.set(key, (songInstrumentPollVersions.get(key) ?? 0) + 1);
  }

  function cancelAllSongInstrumentPolls(): void {
    for (const timeoutId of songInstrumentPollTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    for (const timeoutId of songInstrumentProgressTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    songInstrumentPollTimeouts.clear();
    songInstrumentProgressTimeouts.clear();
    songInstrumentPollVersions.clear();
  }

  function extractUploadErrorDetails(error: unknown): UploadErrorDetails {
    if (!isHttpErrorLike(error)) {
      return {};
    }

    const response = error.response;
    const data = response?.data;
    return {
      message:
        data?.message ??
        data?.errorMessage ??
        (typeof error.message === 'string' ? error.message : undefined),
      code: data?.code ?? (typeof error.code === 'string' ? error.code : undefined),
      status: response?.status,
      name: typeof error.name === 'string' ? error.name : undefined,
    };
  }

  function mapUploadErrorMessage(
    details: UploadErrorDetails,
    fallbackMessage: string,
  ): string {
    const message = details.message?.toLowerCase() ?? '';
    const code = details.code?.toLowerCase() ?? '';
    const combined = `${code} ${message}`;

    if (combined.includes('songinstrument_not_exists')) {
      return t('dashboard.songs.errors.uploadInstrumentNotFound');
    }

    if (combined.includes('no video file provided')) {
      return t('dashboard.songs.errors.selectVideoFirst');
    }

    if (combined.includes('content-type must be video/mp4')) {
      return t('dashboard.songs.errors.videoMustBeMp4');
    }

    if (
      combined.includes('invalid file format') ||
      combined.includes('corrupted header')
    ) {
      return t('dashboard.songs.errors.corruptedMp4');
    }

    if (combined.includes('video file exceeds')) {
      return t('dashboard.songs.errors.fileTooLarge');
    }

    if (
      code.includes('econnaborted') ||
      message.includes('timeout') ||
      message.includes('exceeded')
    ) {
      return t('dashboard.songs.errors.uploadTimeout');
    }

    if (
      details.name === 'AbortError' ||
      combined.includes('upload aborted by client') ||
      code.includes('err_canceled') ||
      message.includes('canceled')
    ) {
      return t('dashboard.songs.errors.uploadCanceled');
    }

    if (combined.includes('profile required')) {
      return t('dashboard.songs.errors.profileRequired');
    }

    if (
      combined.includes(
        'only the assigned musician can upload for this song instrument',
      )
    ) {
      return t('dashboard.songs.errors.notAssignedMusician');
    }

    if (details.status === 403) {
      return t('dashboard.songs.errors.notAssignedMusician');
    }

    return fallbackMessage;
  }

  function getSongInstrumentUploadErrorMessage(
    songId: string,
    instrument: SongInstrumentListItemResponse,
  ): string {
    const uploadState = getSongInstrumentUploadState(songId, instrument.id);
    if (uploadState.errorMsg) {
      return uploadState.errorMsg;
    }

    const upload = getEffectiveUpload(songId, instrument);
    if (upload?.status === songInstrumentUploadStatuses.FAILED) {
      return mapUploadErrorMessage(
        {
          message: upload.errorMessage,
        },
        t('dashboard.songs.errors.uploadFailedGeneric'),
      );
    }

    return '';
  }

  function getSongInstrumentStatusMessage(
    songId: string,
    instrument: SongInstrumentListItemResponse,
  ): string {
    const uploadState = getSongInstrumentUploadState(songId, instrument.id);
    const progressStage = uploadState.progressStage;
    const video = getEffectiveVideo(songId, instrument.id);
    if (
      video &&
      progressStage !== songInstrumentUploadProgressStages.REQUEST &&
      progressStage !== songInstrumentUploadProgressStages.BACKEND
    ) {
      return '';
    }

    const upload = getEffectiveUpload(songId, instrument);
    if (
      uploadState.isSubmitting &&
      uploadState.progressStage === songInstrumentUploadProgressStages.REQUEST
    ) {
      return t('dashboard.songs.status.uploading');
    }

    if (upload?.status === songInstrumentUploadStatuses.PENDING) {
      return t('dashboard.songs.status.pendingValidation');
    }

    if (upload?.status === songInstrumentUploadStatuses.READY) {
      return t('dashboard.songs.status.validating');
    }

    if (upload?.status === songInstrumentUploadStatuses.PROCESSING) {
      return t('dashboard.songs.status.processing');
    }

    if (upload?.status === songInstrumentUploadStatuses.COMPLETED) {
      return t('dashboard.songs.status.finalizing');
    }

    return uploadState.successMsg;
  }

  function getSongInstrumentProgressCap(
    upload: SongInstrumentUploadResponse | null,
  ): number {
    if (upload?.status === songInstrumentUploadStatuses.PENDING) {
      return 52;
    }

    if (upload?.status === songInstrumentUploadStatuses.READY) {
      return 72;
    }

    if (upload?.status === songInstrumentUploadStatuses.PROCESSING) {
      return 88;
    }

    if (upload?.status === songInstrumentUploadStatuses.COMPLETED) {
      return 96;
    }

    return 0;
  }

  function getSongInstrumentProgressFloor(
    upload: SongInstrumentUploadResponse | null,
  ): number {
    if (upload?.status === songInstrumentUploadStatuses.PENDING) {
      return 24;
    }

    if (upload?.status === songInstrumentUploadStatuses.READY) {
      return 48;
    }

    if (upload?.status === songInstrumentUploadStatuses.PROCESSING) {
      return 68;
    }

    if (upload?.status === songInstrumentUploadStatuses.COMPLETED) {
      return 92;
    }

    return 0;
  }

  function getSongInstrumentProgressIncrement(
    stage: SongInstrumentUploadProgressStage,
    progress: number,
    upload: SongInstrumentUploadResponse | null,
  ): number {
    if (stage === songInstrumentUploadProgressStages.REQUEST) {
      if (progress < 16) {
        return 8;
      }

      if (progress < 30) {
        return 6;
      }

      return 4;
    }

    if (upload?.status === songInstrumentUploadStatuses.PENDING) {
      return 5;
    }

    if (upload?.status === songInstrumentUploadStatuses.READY) {
      return 4;
    }

    if (upload?.status === songInstrumentUploadStatuses.PROCESSING) {
      return 3;
    }

    if (upload?.status === songInstrumentUploadStatuses.COMPLETED) {
      return 2;
    }

    return 0;
  }

  function scheduleSongInstrumentProgressTick(songId: string, instrumentId: string): void {
    clearSongInstrumentProgressTimer(songId, instrumentId);
    const key = getSongInstrumentUploadKey(songId, instrumentId);
    const timeoutId = setTimeout(() => {
      const isSongStillVisible = songs.value.some((song) => song.id === songId);
      if (!isComposableMounted || !isSongStillVisible) {
        clearSongInstrumentProgressTimer(songId, instrumentId);
        return;
      }

      const uploadState = getSongInstrumentUploadState(songId, instrumentId);
      if (
        uploadState.progressStage !== songInstrumentUploadProgressStages.REQUEST &&
        uploadState.progressStage !== songInstrumentUploadProgressStages.BACKEND
      ) {
        clearSongInstrumentProgressTimer(songId, instrumentId);
        return;
      }

      const instrument = getSongInstrument(songId, instrumentId);
      const upload = instrument ? getEffectiveUpload(songId, instrument) : null;
      const cap =
        uploadState.progressStage === songInstrumentUploadProgressStages.REQUEST
          ? 36
          : getSongInstrumentProgressCap(upload);
      const nextProgress = Math.min(
        cap,
        uploadState.progress +
          getSongInstrumentProgressIncrement(
            uploadState.progressStage,
            uploadState.progress,
            upload,
          ),
      );

      if (nextProgress !== uploadState.progress) {
        setSongInstrumentUploadState(songId, instrumentId, {
          progress: nextProgress,
        });
      }

      if (nextProgress < cap) {
        scheduleSongInstrumentProgressTick(songId, instrumentId);
        return;
      }

      clearSongInstrumentProgressTimer(songId, instrumentId);
    }, SONG_INSTRUMENT_PROGRESS_TICK_MS);
    songInstrumentProgressTimeouts.set(key, timeoutId);
  }

  function startSongInstrumentRequestProgress(songId: string, instrumentId: string): void {
    setSongInstrumentUploadState(songId, instrumentId, {
      progress: 0,
      progressStage: songInstrumentUploadProgressStages.REQUEST,
    });
    scheduleSongInstrumentProgressTick(songId, instrumentId);
  }

  function startSongInstrumentBackendProgress(
    songId: string,
    instrumentId: string,
    upload: SongInstrumentUploadResponse | null,
  ): void {
    const current = getSongInstrumentUploadState(songId, instrumentId);
    setSongInstrumentUploadState(songId, instrumentId, {
      progress: Math.max(current.progress, getSongInstrumentProgressFloor(upload)),
      progressStage: songInstrumentUploadProgressStages.BACKEND,
    });
    scheduleSongInstrumentProgressTick(songId, instrumentId);
  }

  function completeSongInstrumentProgress(songId: string, instrumentId: string): void {
    clearSongInstrumentProgressTimer(songId, instrumentId);
    setSongInstrumentUploadState(songId, instrumentId, {
      progress: 100,
      progressStage: songInstrumentUploadProgressStages.COMPLETE,
    });
  }

  function resetSongInstrumentProgress(songId: string, instrumentId: string): void {
    clearSongInstrumentProgressTimer(songId, instrumentId);
    setSongInstrumentUploadState(songId, instrumentId, {
      progress: 0,
      progressStage: songInstrumentUploadProgressStages.IDLE,
    });
  }

  function shouldShowSongInstrumentProgress(songId: string, instrumentId: string): boolean {
    const progressStage = getSongInstrumentUploadState(songId, instrumentId).progressStage;
    return (
      progressStage === songInstrumentUploadProgressStages.REQUEST ||
      progressStage === songInstrumentUploadProgressStages.BACKEND
    );
  }

  function hasSongInstrumentVideo(songId: string, instrumentId: string): boolean {
    return getEffectiveVideo(songId, instrumentId) !== null;
  }

  function getSongInstrumentAvailabilityLabel(songId: string, instrumentId: string): string {
    const instrument = getSongInstrument(songId, instrumentId);
    const upload = instrument ? getEffectiveUpload(songId, instrument) : null;

    if (upload?.status === songInstrumentUploadStatuses.FAILED) {
      return t('dashboard.songs.availability.error');
    }

    if (upload?.status === songInstrumentUploadStatuses.PENDING) {
      return t('dashboard.songs.availability.pendingValidation');
    }

    if (upload?.status === songInstrumentUploadStatuses.READY) {
      return t('dashboard.songs.availability.validating');
    }

    if (upload?.status === songInstrumentUploadStatuses.PROCESSING) {
      return t('dashboard.songs.availability.processing');
    }

    if (
      upload?.status === songInstrumentUploadStatuses.COMPLETED &&
      !hasSongInstrumentVideo(songId, instrumentId)
    ) {
      return t('dashboard.songs.availability.finalizing');
    }

    return hasSongInstrumentVideo(songId, instrumentId)
      ? t('dashboard.songs.availability.available')
      : t('dashboard.songs.availability.pending');
  }

  function getSongInstrumentAvailabilityBadgeClass(
    songId: string,
    instrumentId: string,
  ): string {
    const instrument = getSongInstrument(songId, instrumentId);
    const upload = instrument ? getEffectiveUpload(songId, instrument) : null;

    if (upload?.status === songInstrumentUploadStatuses.FAILED) {
      return 'text-bg-danger';
    }

    if (upload?.status === songInstrumentUploadStatuses.PENDING) {
      return 'text-bg-warning';
    }

    if (upload?.status === songInstrumentUploadStatuses.READY) {
      return 'text-bg-info';
    }

    if (upload?.status === songInstrumentUploadStatuses.PROCESSING) {
      return 'text-bg-primary';
    }

    if (
      upload?.status === songInstrumentUploadStatuses.COMPLETED &&
      !hasSongInstrumentVideo(songId, instrumentId)
    ) {
      return 'text-bg-secondary';
    }

    return hasSongInstrumentVideo(songId, instrumentId) ? 'text-bg-success' : 'text-bg-warning';
  }

  function getSongInstrumentAvailabilityTestId(songId: string, instrumentId: string): string {
    const instrument = getSongInstrument(songId, instrumentId);
    const upload = instrument ? getEffectiveUpload(songId, instrument) : null;
    const isAvailable =
      upload?.status !== songInstrumentUploadStatuses.FAILED &&
      upload?.status !== songInstrumentUploadStatuses.PENDING &&
      upload?.status !== songInstrumentUploadStatuses.READY &&
      upload?.status !== songInstrumentUploadStatuses.PROCESSING &&
      hasSongInstrumentVideo(songId, instrumentId);

    return isAvailable
      ? `upload-complete-${songId}-${instrumentId}`
      : `upload-status-${songId}-${instrumentId}`;
  }

  // Vestigial: always returns true. Kept as-is, this is not part of the current extraction scope.
  function shouldShowSongInstrumentUploadForm(_songId: string, _instrumentId: string): boolean {
    return true;
  }

  function isSongInstrumentUploadDisabled(
    songId: string,
    instrument: SongInstrumentListItemResponse,
  ): boolean {
    const uploadState = getSongInstrumentUploadState(songId, instrument.id);
    return (
      uploadState.isSubmitting ||
      isSongInstrumentInProgress(getEffectiveUpload(songId, instrument))
    );
  }

  function isSongInstrumentUploadSubmitDisabled(
    songId: string,
    instrument: SongInstrumentListItemResponse,
  ): boolean {
    const uploadState = getSongInstrumentUploadState(songId, instrument.id);
    return (
      isSongInstrumentUploadDisabled(songId, instrument) || uploadState.selectedFile === null
    );
  }

  function getSongInstrumentSubmitLabel(
    songId: string,
    instrument: SongInstrumentListItemResponse,
  ): string {
    if (isSongInstrumentUploadDisabled(songId, instrument)) {
      return t('dashboard.songs.submitLabel.processing');
    }

    if (
      getEffectiveUpload(songId, instrument)?.status === songInstrumentUploadStatuses.FAILED
    ) {
      return t('dashboard.songs.submitLabel.retry');
    }

    if (hasSongInstrumentVideo(songId, instrument.id)) {
      return t('dashboard.songs.submitLabel.reupload');
    }

    return t('dashboard.songs.submitLabel.upload');
  }

  function scheduleSongInstrumentPoll(
    songId: string,
    instrumentId: string,
    extraReadsAfterCompletedWithoutVideo: number,
  ): void {
    cancelSongInstrumentPoll(songId, instrumentId);
    const key = getSongInstrumentUploadKey(songId, instrumentId);
    const version = songInstrumentPollVersions.get(key) ?? 0;
    const timeoutId = setTimeout(() => {
      void runSongInstrumentPoll(
        songId,
        instrumentId,
        version,
        extraReadsAfterCompletedWithoutVideo,
      );
    }, SONG_INSTRUMENT_POLL_INTERVAL_MS);
    songInstrumentPollTimeouts.set(key, timeoutId);
  }

  async function runSongInstrumentPoll(
    songId: string,
    instrumentId: string,
    version: number,
    extraReadsAfterCompletedWithoutVideo: number,
  ): Promise<void> {
    const key = getSongInstrumentUploadKey(songId, instrumentId);
    const isSongStillVisible = songs.value.some((song) => song.id === songId);
    if (
      !isComposableMounted ||
      !isSongStillVisible ||
      songInstrumentPollVersions.get(key) !== version
    ) {
      return;
    }

    try {
      const detail = await refreshSongInstrumentDetail(songId, instrumentId);
      const isSongStillVisibleAfterRefresh = songs.value.some((song) => song.id === songId);
      if (
        !isComposableMounted ||
        !isSongStillVisibleAfterRefresh ||
        songInstrumentPollVersions.get(key) !== version
      ) {
        return;
      }

      if (isSongInstrumentInProgress(detail.upload)) {
        startSongInstrumentBackendProgress(songId, instrumentId, detail.upload);
        scheduleSongInstrumentPoll(songId, instrumentId, 1);
        return;
      }

      if (detail.upload?.status === songInstrumentUploadStatuses.FAILED) {
        cancelSongInstrumentPoll(songId, instrumentId);
        resetSongInstrumentProgress(songId, instrumentId);
        const message = mapUploadErrorMessage(
          {
            message: detail.upload.errorMessage,
          },
          t('dashboard.songs.errors.uploadFailedGeneric'),
        );
        setSongInstrumentUploadState(songId, instrumentId, {
          isSubmitting: false,
          successMsg: '',
          errorMsg: message,
        });
        showErrorToast(message);
        return;
      }

      if (
        detail.upload?.status === songInstrumentUploadStatuses.COMPLETED &&
        detail.video === null &&
        extraReadsAfterCompletedWithoutVideo > 0
      ) {
        startSongInstrumentBackendProgress(songId, instrumentId, detail.upload);
        scheduleSongInstrumentPoll(
          songId,
          instrumentId,
          extraReadsAfterCompletedWithoutVideo - 1,
        );
        return;
      }

      cancelSongInstrumentPoll(songId, instrumentId);
      if (detail.video) {
        completeSongInstrumentProgress(songId, instrumentId);
      } else {
        resetSongInstrumentProgress(songId, instrumentId);
      }
      setSongInstrumentUploadState(songId, instrumentId, {
        isSubmitting: false,
        successMsg: '',
        errorMsg: detail.video ? '' : undefined,
      });
    } catch (error: unknown) {
      const message = mapUploadErrorMessage(
        extractUploadErrorDetails(error),
        t('dashboard.songs.errors.updateVideoStatusFailed'),
      );
      cancelSongInstrumentPoll(songId, instrumentId);
      resetSongInstrumentProgress(songId, instrumentId);
      setSongInstrumentUploadState(songId, instrumentId, {
        isSubmitting: false,
        successMsg: '',
        errorMsg: message,
      });
      showErrorToast(message);
    }
  }

  async function syncSongInstrumentAsyncState(
    songId: string,
    instrument: SongInstrumentListItemResponse,
  ): Promise<void> {
    if (isSongInstrumentInProgress(instrument.upload)) {
      setSongInstrumentUploadState(songId, instrument.id, {
        isSubmitting: false,
        successMsg: '',
        errorMsg: '',
      });
      startSongInstrumentBackendProgress(songId, instrument.id, instrument.upload);
      scheduleSongInstrumentPoll(songId, instrument.id, 1);
      return;
    }

    if (instrument.upload?.status === songInstrumentUploadStatuses.COMPLETED) {
      const detail = await refreshSongInstrumentDetail(songId, instrument.id);
      if (detail.video === null) {
        setSongInstrumentUploadState(songId, instrument.id, {
          isSubmitting: false,
          successMsg: '',
          errorMsg: '',
        });
        startSongInstrumentBackendProgress(songId, instrument.id, detail.upload);
        scheduleSongInstrumentPoll(songId, instrument.id, 1);
        return;
      }
    }

    resetSongInstrumentProgress(songId, instrument.id);
    setSongInstrumentUploadState(songId, instrument.id, {
      isSubmitting: false,
      successMsg: '',
      errorMsg: '',
    });
  }

  function openSongInstrumentUploadModal(songId: string, instrumentId: string): void {
    activeSongInstrumentUploadModal.value = {
      songId,
      instrumentId,
    };
  }

  function closeSongInstrumentUploadModal(): void {
    activeSongInstrumentUploadModal.value = null;
  }

  function handleSongInstrumentVideoSelection(
    songId: string,
    instrumentId: string,
    event: Event,
  ): void {
    const target = event.target;
    const selectedFile =
      target && typeof target === 'object' && 'files' in target
        ? ((target as FileInputLike).files?.[0] ?? null)
        : null;

    if (!selectedFile) {
      const message = t('dashboard.songs.errors.selectVideoFirst');
      resetSongInstrumentProgress(songId, instrumentId);
      setSongInstrumentUploadState(songId, instrumentId, {
        selectedFile: null,
        successMsg: '',
        errorMsg: message,
      });
      showErrorToast(message);
      return;
    }

    if (selectedFile.type !== 'video/mp4') {
      const message = t('dashboard.songs.errors.videoMustBeMp4');
      resetSongInstrumentProgress(songId, instrumentId);
      setSongInstrumentUploadState(songId, instrumentId, {
        selectedFile: null,
        successMsg: '',
        errorMsg: message,
      });
      showErrorToast(message);
      return;
    }

    resetSongInstrumentProgress(songId, instrumentId);
    setSongInstrumentUploadState(songId, instrumentId, {
      selectedFile,
      successMsg: '',
      errorMsg: '',
    });
  }

  async function handleUploadSongInstrumentVideo(
    songId: string,
    instrumentId: string,
  ): Promise<void> {
    const uploadState = getSongInstrumentUploadState(songId, instrumentId);
    if (!uploadState.selectedFile) {
      const message = uploadState.errorMsg || t('dashboard.songs.errors.selectVideoFirst');
      setSongInstrumentUploadState(songId, instrumentId, {
        errorMsg: message,
        successMsg: '',
      });
      showErrorToast(message);
      return;
    }

    setSongInstrumentUploadState(songId, instrumentId, {
      isSubmitting: true,
      errorMsg: '',
      successMsg: '',
    });
    setSongInstrumentUploadStatus(songId, instrumentId, {
      status: songInstrumentUploadStatuses.PENDING,
    });
    startSongInstrumentRequestProgress(songId, instrumentId);

    try {
      await uploadSongInstrumentVideoUseCase.run(songId, instrumentId, uploadState.selectedFile);
      setSongInstrumentUploadState(songId, instrumentId, {
        selectedFile: null,
        isSubmitting: false,
        successMsg: '',
      });
      startSongInstrumentBackendProgress(songId, instrumentId, {
        status: songInstrumentUploadStatuses.PENDING,
      });
      scheduleSongInstrumentPoll(songId, instrumentId, 1);
      closeSongInstrumentUploadModal();
    } catch (error: unknown) {
      const message = mapUploadErrorMessage(
        extractUploadErrorDetails(error),
        t('dashboard.songs.errors.uploadStartFailed'),
      );
      resetSongInstrumentProgress(songId, instrumentId);
      setSongInstrumentUploadState(songId, instrumentId, {
        errorMsg: message,
        isSubmitting: false,
        successMsg: '',
      });
      showErrorToast(message);
      setSongInstrumentUploadStatus(songId, instrumentId, null);
    }
  }

  return {
    songInstrumentUploads,
    songInstrumentUploadModalRef,
    activeSongInstrumentUploadModal,
    activeSongInstrumentUploadModalContext,
    getSongInstrumentUploadState,
    setSongInstrumentUploadState,
    setSongInstrumentUploadStatus,
    clearSongInstrumentProgressTimer,
    cancelSongInstrumentPoll,
    cancelAllSongInstrumentPolls,
    extractUploadErrorDetails,
    mapUploadErrorMessage,
    getSongInstrumentUploadErrorMessage,
    getSongInstrumentStatusMessage,
    getSongInstrumentProgressCap,
    getSongInstrumentProgressFloor,
    getSongInstrumentProgressIncrement,
    scheduleSongInstrumentProgressTick,
    startSongInstrumentRequestProgress,
    startSongInstrumentBackendProgress,
    completeSongInstrumentProgress,
    resetSongInstrumentProgress,
    shouldShowSongInstrumentProgress,
    hasSongInstrumentVideo,
    getSongInstrumentAvailabilityLabel,
    getSongInstrumentAvailabilityBadgeClass,
    getSongInstrumentAvailabilityTestId,
    shouldShowSongInstrumentUploadForm,
    isSongInstrumentUploadDisabled,
    isSongInstrumentUploadSubmitDisabled,
    getSongInstrumentSubmitLabel,
    scheduleSongInstrumentPoll,
    runSongInstrumentPoll,
    syncSongInstrumentAsyncState,
    openSongInstrumentUploadModal,
    closeSongInstrumentUploadModal,
    handleSongInstrumentVideoSelection,
    handleUploadSongInstrumentVideo,
  };
}

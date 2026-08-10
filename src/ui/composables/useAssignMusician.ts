import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { BandMemberResponse } from '../../domain/band/BandMemberResponse.js';
import type {
  SongInstrumentDetailResponse,
  SongInstrumentListItemResponse,
} from '../../domain/song/SongInstrumentResponse.js';
import type { MusicianSummaryResponse } from '../../domain/musician/MusicianSummaryResponse.js';
import type { SongResponse } from '../../domain/song/SongResponse.js';
import { useToastStore } from '../stores/useToastStore.js';
import type { UploadErrorDetails } from './useSongInstrumentUpload.js';

export interface AssignableBandMemberViewModel {
  id: string;
  name: string;
  username: string;
}

export interface AssignMusicianModalState {
  songId: string;
  instrumentId: string;
  email: string;
  isSubmitting: boolean;
  errorMsg: string;
  members: AssignableBandMemberViewModel[];
  isLoadingMembers: boolean;
  membersErrorMsg: string;
}

interface TextInputLike {
  value?: string;
}

interface UseAssignMusicianUseCases {
  getBandMembersUseCase: { run(bandId: string): Promise<BandMemberResponse[]> };
  assignSongInstrumentMusicianUseCase: {
    run(songId: string, instrumentId: string, musicianId: string): Promise<void>;
  };
  inviteSongInstrumentMusicianUseCase: {
    run(songId: string, instrumentId: string, musicianEmail: string): Promise<void>;
  };
  getMusicianByIdUseCase: { run(musicianId: string): Promise<MusicianSummaryResponse | null> };
}

interface UseAssignMusicianDeps extends UseAssignMusicianUseCases {
  songs: Ref<SongResponse[]>;
  selectedBandId: ComputedRef<string | null>;
  getSongInstrument: (
    songId: string,
    instrumentId: string,
  ) => SongInstrumentListItemResponse | null;
  refreshSongInstrumentDetail: (
    songId: string,
    instrumentId: string,
  ) => Promise<SongInstrumentDetailResponse>;
  resolveMusicianDisplayName: (name: string, username: string) => string;
  extractUploadErrorDetails: (error: unknown) => UploadErrorDetails;
}

/**
 * Owns the assign/invite musician modal: loading candidate band members, assigning an existing
 * musician to a song instrument, and inviting a new musician by email.
 */
export function useAssignMusician(deps: UseAssignMusicianDeps) {
  const {
    getBandMembersUseCase,
    assignSongInstrumentMusicianUseCase,
    inviteSongInstrumentMusicianUseCase,
    getMusicianByIdUseCase,
    songs,
    selectedBandId,
    getSongInstrument,
    refreshSongInstrumentDetail,
    resolveMusicianDisplayName,
    extractUploadErrorDetails,
  } = deps;
  const { t } = useI18n();
  const toastStore = useToastStore();

  const activeAssignMusicianModal = ref<AssignMusicianModalState | null>(null);
  const assignMusicianModalRef = ref<HTMLElement | null>(null);

  function showErrorToast(message: string): void {
    toastStore.error(message);
  }

  function showSuccessToast(message: string): void {
    toastStore.success(message);
  }

  const activeAssignMusicianModalContext = computed(() => {
    if (!activeAssignMusicianModal.value) {
      return null;
    }

    const song = songs.value.find(
      (candidate) => candidate.id === activeAssignMusicianModal.value?.songId,
    );
    if (!song) {
      return null;
    }

    const instrument = getSongInstrument(
      activeAssignMusicianModal.value.songId,
      activeAssignMusicianModal.value.instrumentId,
    );
    if (!instrument) {
      return null;
    }

    return {
      song,
      instrument,
    };
  });

  function isAssignMusicianModalActive(songId: string, instrumentId: string): boolean {
    return (
      activeAssignMusicianModal.value?.songId === songId &&
      activeAssignMusicianModal.value?.instrumentId === instrumentId
    );
  }

  async function resolveAssignableBandMember(
    member: BandMemberResponse,
  ): Promise<AssignableBandMemberViewModel | null> {
    const musician = await getMusicianByIdUseCase.run(member.musicianId);
    if (!musician) {
      return null;
    }

    const displayName = resolveMusicianDisplayName(musician.name, musician.username);
    const username = musician.username.trim();
    return {
      id: musician.id,
      name: displayName || musician.id,
      username: username ? `@${username}` : '',
    };
  }

  async function loadAssignableBandMembers(
    songId: string,
    instrumentId: string,
    bandId: string | null,
  ): Promise<void> {
    if (!bandId || !isAssignMusicianModalActive(songId, instrumentId)) {
      return;
    }

    const currentModal = activeAssignMusicianModal.value;
    if (!currentModal) {
      return;
    }

    activeAssignMusicianModal.value = {
      ...currentModal,
      isLoadingMembers: true,
      membersErrorMsg: '',
      members: [],
    };

    try {
      const bandMembers = await getBandMembersUseCase.run(bandId);
      const resolvedMembers = await Promise.all(bandMembers.map(resolveAssignableBandMember));
      if (
        !isAssignMusicianModalActive(songId, instrumentId) ||
        selectedBandId.value !== bandId ||
        !activeAssignMusicianModal.value
      ) {
        return;
      }

      const currentModal = activeAssignMusicianModal.value;
      if (!currentModal) {
        return;
      }

      activeAssignMusicianModal.value = {
        ...currentModal,
        members: resolvedMembers.filter(
          (member): member is AssignableBandMemberViewModel => member !== null,
        ),
        isLoadingMembers: false,
        membersErrorMsg: '',
      };
    } catch {
      if (
        !isAssignMusicianModalActive(songId, instrumentId) ||
        selectedBandId.value !== bandId ||
        !activeAssignMusicianModal.value
      ) {
        return;
      }

      const message = t('dashboard.songs.errors.loadMembersFailed');
      const currentModal = activeAssignMusicianModal.value;
      if (!currentModal) {
        return;
      }

      activeAssignMusicianModal.value = {
        ...currentModal,
        members: [],
        isLoadingMembers: false,
        membersErrorMsg: message,
      };
      showErrorToast(message);
    }
  }

  function mapAssignMusicianErrorMessage(details: UploadErrorDetails): string {
    const message = details.message?.toLowerCase() ?? '';
    const code = details.code?.toLowerCase() ?? '';
    const combined = `${code} ${message}`;

    if (details.status === 401 || details.status === 403) {
      return t('dashboard.songs.errors.noPermissionAssign');
    }

    if (details.status === 404 || combined.includes('songinstrument_not_exists')) {
      return t('dashboard.songs.errors.instrumentNotFoundForUpdate');
    }

    if (details.status === 400) {
      return t('dashboard.songs.errors.assignMusicianFailed');
    }

    return t('dashboard.songs.errors.assignMusicianUnexpected');
  }

  function mapInviteMusicianErrorMessage(details: UploadErrorDetails): string {
    const message = details.message?.toLowerCase() ?? '';
    const code = details.code?.toLowerCase() ?? '';
    const combined = `${code} ${message}`;

    if (details.status === 401 || details.status === 403) {
      return t('dashboard.songs.errors.noPermissionInvite');
    }

    if (details.status === 404 || combined.includes('songinstrument_not_exists')) {
      return t('dashboard.songs.errors.instrumentNotFoundForUpdate');
    }

    if (combined.includes('musicianemail cannot be empty')) {
      return t('dashboard.songs.errors.emptyInviteEmail');
    }

    if (combined.includes('musicianemail must be a valid email')) {
      return t('dashboard.songs.errors.invalidInviteEmail');
    }

    if (details.status === 400) {
      return t('dashboard.songs.errors.inviteFailed');
    }

    return t('dashboard.songs.errors.inviteUnexpected');
  }

  function openAssignMusicianModal(songId: string, instrumentId: string): void {
    activeAssignMusicianModal.value = {
      songId,
      instrumentId,
      email: '',
      isSubmitting: false,
      errorMsg: '',
      members: [],
      isLoadingMembers: false,
      membersErrorMsg: '',
    };
    void loadAssignableBandMembers(songId, instrumentId, selectedBandId.value);
  }

  function closeAssignMusicianModal(): void {
    activeAssignMusicianModal.value = null;
  }

  function handleAssignMusicianEmailInput(event: Event): void {
    const target = event.target;
    const nextEmail =
      target && typeof target === 'object' && 'value' in target
        ? ((target as TextInputLike).value ?? '')
        : '';
    if (!activeAssignMusicianModal.value) {
      return;
    }

    activeAssignMusicianModal.value = {
      ...activeAssignMusicianModal.value,
      email: nextEmail,
      errorMsg: '',
    };
  }

  async function assignMusicianById(musicianId: string): Promise<void> {
    if (!activeAssignMusicianModal.value) {
      return;
    }

    const modalState = activeAssignMusicianModal.value;
    activeAssignMusicianModal.value = {
      ...modalState,
      isSubmitting: true,
      errorMsg: '',
    };

    try {
      await assignSongInstrumentMusicianUseCase.run(
        modalState.songId,
        modalState.instrumentId,
        musicianId,
      );
      await refreshSongInstrumentDetail(modalState.songId, modalState.instrumentId);
      if (isAssignMusicianModalActive(modalState.songId, modalState.instrumentId)) {
        showSuccessToast(t('dashboard.songs.success.musicianAssigned'));
        closeAssignMusicianModal();
      }
    } catch (error: unknown) {
      if (!isAssignMusicianModalActive(modalState.songId, modalState.instrumentId)) {
        return;
      }

      const message = mapAssignMusicianErrorMessage(extractUploadErrorDetails(error));
      activeAssignMusicianModal.value = {
        ...activeAssignMusicianModal.value,
        isSubmitting: false,
        errorMsg: message,
      };
      showErrorToast(message);
    }
  }

  async function handleAssignMusicianSubmit(): Promise<void> {
    if (!activeAssignMusicianModal.value) {
      return;
    }

    const modalState = activeAssignMusicianModal.value;
    activeAssignMusicianModal.value = {
      ...modalState,
      isSubmitting: true,
      errorMsg: '',
    };

    try {
      await inviteSongInstrumentMusicianUseCase.run(
        modalState.songId,
        modalState.instrumentId,
        modalState.email,
      );
      await refreshSongInstrumentDetail(modalState.songId, modalState.instrumentId);
      if (isAssignMusicianModalActive(modalState.songId, modalState.instrumentId)) {
        showSuccessToast(t('dashboard.songs.success.invitationSent'));
        closeAssignMusicianModal();
      }
    } catch (error: unknown) {
      if (!isAssignMusicianModalActive(modalState.songId, modalState.instrumentId)) {
        return;
      }

      const message = mapInviteMusicianErrorMessage(extractUploadErrorDetails(error));
      activeAssignMusicianModal.value = {
        ...activeAssignMusicianModal.value,
        isSubmitting: false,
        errorMsg: message,
      };
      showErrorToast(message);
    }
  }

  async function handleAssignBandMemberSelection(
    member: AssignableBandMemberViewModel,
  ): Promise<void> {
    await assignMusicianById(member.id);
  }

  return {
    activeAssignMusicianModal,
    assignMusicianModalRef,
    activeAssignMusicianModalContext,
    openAssignMusicianModal,
    closeAssignMusicianModal,
    handleAssignMusicianEmailInput,
    assignMusicianById,
    handleAssignMusicianSubmit,
    handleAssignBandMemberSelection,
  };
}

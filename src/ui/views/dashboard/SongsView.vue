<script setup lang="ts">
import { Tooltip } from "bootstrap";
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	onUpdated,
	ref,
	watch,
} from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { SongInstrumentListItemResponse } from "../../../domain/song/SongInstrumentResponse.js";
import type { SongResponse } from "../../../domain/song/SongResponse.js";
import { ValidationError } from "../../../domain/shared/ValidationError.js";
import { container } from "../../bootstrap/container.js";
import { useBandStore } from "../../stores/useBandStore.js";
import { useMusicianStore } from "../../stores/useMusicianStore.js";
import { useToastStore } from "../../stores/useToastStore.js";
import { useModalFocusTrap } from "../../composables/useModalFocusTrap.js";
import { useSongInstrumentCatalog } from "../../composables/useSongInstrumentCatalog.js";
import { useMusicianDisplayNames } from "../../composables/useMusicianDisplayNames.js";
import { useCreateSong } from "../../composables/useCreateSong.js";
import { useSongInstrumentDetails } from "../../composables/useSongInstrumentDetails.js";
import { useVideoPreview } from "../../composables/useVideoPreview.js";
import { useAddSongInstrument } from "../../composables/useAddSongInstrument.js";
import { useSongInstrumentUpload } from "../../composables/useSongInstrumentUpload.js";
import { useAssignMusician } from "../../composables/useAssignMusician.js";
import { useEditSongInstrument } from "../../composables/useEditSongInstrument.js";

type SongInstrumentMap = Record<string, SongInstrumentListItemResponse[]>;
type TooltipTarget = Element;
type TooltipInstance = {
	dispose: () => void;
};

const { t } = useI18n();
const bandStore = useBandStore();
const musicianStore = useMusicianStore();
const toastStore = useToastStore();
const router = useRouter();
const songsErrorMsg = ref("");
const isLoadingSongs = ref(false);
const songs = ref<SongResponse[]>([]);
const songInstruments = ref<SongInstrumentMap>({});
const songActionTooltipTargets = ref<TooltipTarget[]>([]);
const createSongModalRef = ref<HTMLElement | null>(null);

const {
	createSongUseCase,
	getBandMembersUseCase,
	getBandSongsUseCase,
	createSongInstrumentUseCase,
	getSongInstrumentsUseCase,
	getSongInstrumentDetailUseCase,
	getInstrumentsUseCase,
	getInstrumentByIdUseCase,
	getMusicianByIdUseCase,
	assignSongInstrumentMusicianUseCase,
	inviteSongInstrumentMusicianUseCase,
	updateSongInstrumentUseCase,
	uploadSongInstrumentVideoUseCase,
} = container.useCases;

const {
	availableInstruments,
	catalogInstrumentNames,
	ensureAvailableInstrumentsLoaded,
	ensureCatalogInstrumentNameLoaded,
	preloadCatalogInstrumentNames,
	getCatalogInstrumentName,
	getSongInstrumentCatalogId,
} = useSongInstrumentCatalog({ getInstrumentsUseCase, getInstrumentByIdUseCase });

const {
	musicianDisplayNames,
	resolveMusicianDisplayName,
	ensureMusicianDisplayNameLoaded,
	preloadMusicianDisplayNames,
} = useMusicianDisplayNames({ getMusicianByIdUseCase });

const {
	songInstrumentDetails,
	getSongInstrumentDetail,
	setSongInstrumentDetail,
	getEffectiveUpload,
	getEffectiveVideo,
	getSongInstrument,
	isSongInstrumentInProgress,
	refreshSongInstrumentDetail,
	getSongInstrumentDisplayName,
} = useSongInstrumentDetails({
	getSongInstrumentDetailUseCase,
	songs,
	songInstruments,
	getSongInstrumentCatalogId,
	ensureCatalogInstrumentNameLoaded,
	getCatalogInstrumentName,
	ensureMusicianDisplayNameLoaded,
});

const selectedBand = computed(() => bandStore.selectedBand);
const selectedBandId = computed(() => bandStore.selectedBandId);

const {
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
} = useCreateSong({ createSongUseCase, selectedBand, onCreated: loadSongs });

const { activeVideoPreview, videoPreviewModalRef, openVideoPreview, closeVideoPreview } =
	useVideoPreview({ getEffectiveVideo, getSongInstrumentDisplayName });

const {
	songInstrumentUploads,
	songInstrumentUploadModalRef,
	activeSongInstrumentUploadModal,
	activeSongInstrumentUploadModalContext,
	getSongInstrumentUploadState,
	setSongInstrumentUploadState,
	setSongInstrumentUploadStatus,
	cancelAllSongInstrumentPolls,
	extractUploadErrorDetails,
	getSongInstrumentUploadErrorMessage,
	getSongInstrumentStatusMessage,
	shouldShowSongInstrumentProgress,
	hasSongInstrumentVideo,
	getSongInstrumentAvailabilityLabel,
	getSongInstrumentAvailabilityBadgeClass,
	getSongInstrumentAvailabilityTestId,
	shouldShowSongInstrumentUploadForm,
	isSongInstrumentUploadDisabled,
	isSongInstrumentUploadSubmitDisabled,
	getSongInstrumentSubmitLabel,
	syncSongInstrumentAsyncState,
	openSongInstrumentUploadModal,
	closeSongInstrumentUploadModal,
	handleSongInstrumentVideoSelection,
	handleUploadSongInstrumentVideo,
} = useSongInstrumentUpload({
	uploadSongInstrumentVideoUseCase,
	songs,
	songInstruments,
	refreshSongInstrumentDetail,
	getEffectiveUpload,
	getEffectiveVideo,
	getSongInstrument,
	isSongInstrumentInProgress,
});

const {
	songInstrumentForms,
	songInstrumentFormModalRef,
	activeSongInstrumentFormSong,
	getSongInstrumentForm,
	openSongInstrumentForm,
	closeSongInstrumentForm,
	handleCreateSongInstrument,
} = useAddSongInstrument({
	createSongInstrumentUseCase,
	getSongInstrumentsUseCase,
	songs,
	songInstruments,
	ensureAvailableInstrumentsLoaded,
	preloadCatalogInstrumentNames,
	syncSongInstrumentAsyncState,
});

const {
	activeAssignMusicianModal,
	assignMusicianModalRef,
	activeAssignMusicianModalContext,
	isInviteEmailValid,
	openAssignMusicianModal,
	closeAssignMusicianModal,
	handleAssignMusicianEmailInput,
	assignMusicianById,
	handleAssignMusicianSubmit,
	handleAssignBandMemberSelection,
} = useAssignMusician({
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
});

const {
	activeEditInstrumentModal,
	editInstrumentModalRef,
	activeEditInstrumentModalContext,
	openEditInstrumentModal,
	closeEditInstrumentModal,
	handleEditInstrumentNameInput,
	handleEditInstrumentCatalogInput,
	handleEditInstrumentSubmit,
} = useEditSongInstrument({
	getSongInstrumentDetailUseCase,
	updateSongInstrumentUseCase,
	songs,
	getSongInstrument,
	setSongInstrumentDetail,
	getSongInstrumentCatalogId,
	ensureCatalogInstrumentNameLoaded,
	ensureAvailableInstrumentsLoaded,
	extractUploadErrorDetails,
});

const isAnyModalOpen = computed(
	() =>
		isCreateSongModalOpen.value ||
		activeSongInstrumentFormSong.value !== null ||
		activeSongInstrumentUploadModalContext.value !== null ||
		activeAssignMusicianModalContext.value !== null ||
		activeEditInstrumentModalContext.value !== null ||
		activeVideoPreview.value !== null,
);

let songActionTooltips: TooltipInstance[] = [];
let isViewMounted = true;
let lastSongsRequestId = 0;
let previousBodyOverflow: string | null = null;

function showErrorToast(message: string): void {
	toastStore.error(message);
}

function showSuccessToast(message: string): void {
	toastStore.success(message);
}

function disposeSongActionTooltips(): void {
	for (const tooltip of songActionTooltips) {
		tooltip.dispose();
	}
	songActionTooltips = [];
}

async function syncSongActionTooltips(): Promise<void> {
	if (!isViewMounted) {
		return;
	}

	await nextTick();
	disposeSongActionTooltips();
	// animation: false avoids a Bootstrap timing bug where a pending fade
	// transition callback fires after dispose() and throws on a null element.
	songActionTooltips = songActionTooltipTargets.value.map((target) =>
		Tooltip.getOrCreateInstance(target, { animation: false }) as TooltipInstance,
	);
}

function getSongInstrumentMusicianDisplayName(
	instrument: SongInstrumentListItemResponse,
): string {
	const currentProfile = musicianStore.profile;
	if (currentProfile?.id === instrument.musicianId) {
		return (
			resolveMusicianDisplayName(currentProfile.name, currentProfile.username) ||
			instrument.musicianId ||
			t('dashboard.songs.unassigned')
		);
	}

	return (
		musicianDisplayNames.value[instrument.musicianId] ??
		instrument.musicianId ??
		t('dashboard.songs.unassigned')
	);
}

async function loadSongInstruments(
	songList: SongResponse[],
	requestId: number,
): Promise<void> {
	void ensureAvailableInstrumentsLoaded();
	const entries = await Promise.all(
		songList.map(async (song) => {
			const instruments = await getSongInstrumentsUseCase.run(song.id);
			return [song.id, instruments] as const;
		}),
	);

	if (requestId !== lastSongsRequestId || !isViewMounted) {
		return;
	}

	songInstruments.value = Object.fromEntries(entries);
	await Promise.all(
		entries.flatMap(([, instruments]) => [
			preloadCatalogInstrumentNames(instruments),
			preloadMusicianDisplayNames(instruments),
		]),
	);
	await Promise.all(
		entries.flatMap(([songId, instruments]) =>
			instruments.map((instrument) => syncSongInstrumentAsyncState(songId, instrument)),
		),
	);
}

async function loadSongs(bandId: string | null) {
	const requestId = ++lastSongsRequestId;
	cancelAllSongInstrumentPolls();

	if (!bandId) {
		songs.value = [];
		songInstruments.value = {};
		songInstrumentForms.value = {};
		songInstrumentUploads.value = {};
		songInstrumentDetails.value = {};
		musicianDisplayNames.value = {};
		songsErrorMsg.value = "";
		isLoadingSongs.value = false;
		return;
	}

	isLoadingSongs.value = true;
	songsErrorMsg.value = "";
	songInstrumentDetails.value = {};
	musicianDisplayNames.value = {};

	try {
		const nextSongs = await getBandSongsUseCase.run(bandId);
		if (requestId !== lastSongsRequestId || !isViewMounted) {
			return;
		}

		songs.value = nextSongs;
		songInstrumentForms.value = Object.fromEntries(
			nextSongs.map((song) => [song.id, getSongInstrumentForm(song.id)]),
		);
		await loadSongInstruments(nextSongs, requestId);
		await focusSongAnchorFromLocation();
	} catch (error: unknown) {
		if (requestId !== lastSongsRequestId || !isViewMounted) {
			return;
		}

		songs.value = [];
		songInstruments.value = {};
		songInstrumentForms.value = {};
		songInstrumentUploads.value = {};
		songInstrumentDetails.value = {};
		musicianDisplayNames.value = {};
		const message =
			error instanceof ValidationError
				? error.message
				: (console.error(error), t('dashboard.songs.errors.loadSongsUnexpected'));
		songsErrorMsg.value = message;
		showErrorToast(message);
	} finally {
		if (requestId === lastSongsRequestId) {
			isLoadingSongs.value = false;
		}
	}
}

watch(
	selectedBand,
	(band) => {
		void loadSongs(band?.id.value ?? null);
	},
	{ immediate: true },
);

watch(
	isAnyModalOpen,
	(isOpen) => {
		if (typeof document === "undefined") {
			return;
		}

		const bodyStyle = document.body?.style;
		if (!bodyStyle) {
			return;
		}

		if (isOpen) {
			if (previousBodyOverflow === null) {
				previousBodyOverflow = bodyStyle.overflow;
			}
			bodyStyle.overflow = "hidden";
			return;
		}

		if (previousBodyOverflow !== null) {
			bodyStyle.overflow = previousBodyOverflow;
			previousBodyOverflow = null;
		}
	},
	{ immediate: true },
);

onMounted(() => {
	void syncSongActionTooltips();
});

onUpdated(() => {
	void syncSongActionTooltips();
});

onBeforeUnmount(() => {
	isViewMounted = false;
	disposeSongActionTooltips();
	cancelAllSongInstrumentPolls();
	if (typeof document !== "undefined" && previousBodyOverflow !== null) {
		const bodyStyle = document.body?.style;
		if (bodyStyle) {
			bodyStyle.overflow = previousBodyOverflow;
		}
		previousBodyOverflow = null;
	}
});

function openSongTrackEditor(song: SongResponse): void {
	void router.push({
		name: "SongTrackEditor",
		params: { songId: song.id },
		query: {
			title: song.title,
			...(typeof song.originalVideoClipDurationSeconds === "number"
				? {
					originalVideoClipDurationSeconds: String(
						song.originalVideoClipDurationSeconds,
					),
				}
				: {}),
		},
	});
}

async function focusSongAnchorFromLocation(): Promise<void> {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}

	const anchorId = window.location.hash.replace(/^#/, "").trim();
	if (!anchorId) {
		return;
	}

	await nextTick();
	const target = document.getElementById(anchorId);
	if (!(target instanceof HTMLElement)) {
		return;
	}

	target.scrollIntoView({ block: "start", behavior: "auto" });
	target.focus({ preventScroll: true });
}

useModalFocusTrap(createSongModalRef, isCreateSongModalOpen, {
	onEscape: closeCreateSongModal,
});
useModalFocusTrap(
	songInstrumentFormModalRef,
	computed(() => activeSongInstrumentFormSong.value !== null),
	{
		onEscape: () => {
			if (activeSongInstrumentFormSong.value) {
				closeSongInstrumentForm(activeSongInstrumentFormSong.value.id);
			}
		},
	},
);
useModalFocusTrap(
	songInstrumentUploadModalRef,
	computed(() => activeSongInstrumentUploadModalContext.value !== null),
	{ onEscape: closeSongInstrumentUploadModal },
);
useModalFocusTrap(
	assignMusicianModalRef,
	computed(() => activeAssignMusicianModalContext.value !== null && activeAssignMusicianModal.value !== null),
	{ onEscape: closeAssignMusicianModal },
);
useModalFocusTrap(
	editInstrumentModalRef,
	computed(() => activeEditInstrumentModalContext.value !== null && activeEditInstrumentModal.value !== null),
	{ onEscape: closeEditInstrumentModal },
);
useModalFocusTrap(
	videoPreviewModalRef,
	computed(() => activeVideoPreview.value !== null),
	{ onEscape: closeVideoPreview },
);

</script>

<template>
  <div>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <div>
        <h1 class="h2">{{ $t('dashboard.songs.pageTitle') }}</h1>
        <p class="text-muted mb-0">
          {{ $t('dashboard.songs.pageDescription') }}
        </p>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
          <div>
            <h2 class="h5 mb-0">{{ $t('dashboard.songs.listTitle') }}</h2>
            <span v-if="selectedBand && !isLoadingSongs" class="text-muted small">
              {{ $t('dashboard.songs.songCount', songs.length) }}
            </span>
          </div>

          <button
            type="button"
            class="btn btn-primary"
            :disabled="!canSubmit"
            @click="openCreateSongModal"
          >
            {{ $t('dashboard.songs.createSong') }}
          </button>
        </div>

        <p v-if="!selectedBand" class="text-muted mb-0">
          {{ $t('dashboard.songs.selectBandToView') }}
        </p>

        <p v-else-if="isLoadingSongs" class="text-muted mb-0">
          {{ $t('dashboard.songs.loadingSongs') }}
        </p>

        <p v-else-if="songsErrorMsg" class="text-muted mb-0">
          {{ $t('dashboard.songs.loadSongsError') }}
        </p>

        <p v-else-if="songs.length === 0" class="text-muted mb-0">
          {{ $t('dashboard.songs.noSongsYet') }}
        </p>

        <div v-else data-testid="songs-list" class="d-grid gap-3">
          <article
            v-for="song in songs"
            :id="song.id"
            :key="song.id"
            class="border rounded-3 p-3 bg-body-tertiary"
            tabindex="-1"
          >
                <div class="d-flex flex-column gap-3">
                  <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2">
                    <div>
                      <h3 class="h5 mb-1">{{ song.title }}</h3>
                      <p class="text-muted small mb-0">{{ $t('dashboard.songs.originalVideoclip') }}</p>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        class="btn btn-outline-primary btn-sm"
                        @click="openSongTrackEditor(song)"
                      >
                        {{ $t('dashboard.songs.editTracks') }}
                      </button>
                      <a
                        :href="song.originalVideoclipUrl"
                        target="_blank"
                        rel="noreferrer noopener"
                        class="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-2"
                      >
                        <span aria-hidden="true">▶</span>
                        <span>{{ $t('dashboard.songs.watchOnYoutube') }}</span>
                      </a>
                    </div>
                  </div>

              <section class="border-top pt-3">
                <div
                  :data-testid="`song-instruments-header-${song.id}`"
                  class="d-flex justify-content-between align-items-center gap-2 mb-3"
                >
                  <h4 class="h6 mb-0">{{ $t('dashboard.songs.instrumentsTitle') }}</h4>
                  <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm py-1 px-2 small"
                    @click="openSongInstrumentForm(song.id)"
                  >
                    {{ $t('dashboard.songs.addInstrument') }}
                  </button>
                </div>
                <p v-if="(songInstruments[song.id] ?? []).length === 0" class="text-muted mb-0 small">
                  {{ $t('dashboard.songs.noInstrumentsYet') }}
                </p>
                <div v-else class="table-responsive">
                  <table class="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col">{{ $t('dashboard.songs.table.index') }}</th>
                        <th scope="col">{{ $t('dashboard.songs.table.trackTitle') }}</th>
                        <th scope="col">{{ $t('dashboard.songs.table.instrument') }}</th>
                        <th scope="col">{{ $t('dashboard.songs.table.musician') }}</th>
                        <th scope="col">{{ $t('dashboard.songs.table.status') }}</th>
                        <th scope="col">{{ $t('dashboard.songs.table.actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(instrument, index) in songInstruments[song.id]" :key="instrument.id">
                        <td>#{{ index + 1 }}</td>
                        <td>{{ instrument.name }}</td>
                        <td>{{ getSongInstrumentDisplayName(instrument) }}</td>
                        <td>{{ getSongInstrumentMusicianDisplayName(instrument) }}</td>
                            <td>
                              <div class="d-inline-flex align-items-center gap-2">
                                <span
                                  :data-testid="getSongInstrumentAvailabilityTestId(song.id, instrument.id)"
                                  class="badge rounded-pill"
                                  :class="getSongInstrumentAvailabilityBadgeClass(song.id, instrument.id)"
                                >
                                  {{ getSongInstrumentAvailabilityLabel(song.id, instrument.id) }}
                                </span>
                                <button
                                  v-if="hasSongInstrumentVideo(song.id, instrument.id)"
                                  ref="songActionTooltipTargets"
                                  type="button"
                                  class="border-0 bg-transparent p-0 d-inline-flex align-items-center justify-content-center text-body-emphasis"
                                  data-bs-toggle="tooltip"
                                  :data-bs-title="$t('dashboard.songs.watchVideo')"
                                  :aria-label="$t('dashboard.songs.watchVideo')"
                                  @click="openVideoPreview(song, instrument)"
                                >
                                  <i class="bi bi-eye" aria-hidden="true"></i>
                                </button>
                              </div>
                            </td>
                        <td>
                          <div class="song-instrument-actions d-flex flex-wrap align-items-center gap-2">
                            <span
                              ref="songActionTooltipTargets"
                              class="song-instrument-action-wrapper d-inline-flex"
                              tabindex="0"
                              data-bs-toggle="tooltip"
                              :data-bs-title="$t('dashboard.songs.edit')"
                              :aria-label="$t('dashboard.songs.edit')"
                            >
                              <button
                                type="button"
                                class="song-instrument-action btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center px-2 rounded-2"
                                :aria-label="$t('dashboard.songs.edit')"
                                :disabled="!song.id || !instrument.id"
                                @click="openEditInstrumentModal(song.id, instrument.id)"
                              >
                                <i class="bi bi-pencil" aria-hidden="true"></i>
                              </button>
                            </span>
                            <button
                              ref="songActionTooltipTargets"
                              type="button"
                              class="song-instrument-action btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center px-2 rounded-2"
                              data-bs-toggle="tooltip"
                              :data-bs-title="$t('dashboard.songs.uploadVideo')"
                              :aria-label="$t('dashboard.songs.uploadVideo')"
                              @click="openSongInstrumentUploadModal(song.id, instrument.id)"
                            >
                              <i class="bi bi-upload" aria-hidden="true"></i>
                            </button>
                            <button
                              ref="songActionTooltipTargets"
                              type="button"
                              class="song-instrument-action btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center px-2 rounded-2"
                              data-bs-toggle="tooltip"
                              :data-bs-title="$t('dashboard.songs.assignMusician')"
                              :aria-label="$t('dashboard.songs.assignMusician')"
                              @click="openAssignMusicianModal(song.id, instrument.id)"
                            >
                              <i class="bi bi-person" aria-hidden="true"></i>
                            </button>
                          </div>
                          <p
                            v-if="getSongInstrumentUploadErrorMessage(song.id, instrument)"
                            class="mb-0 mt-2 small text-danger-emphasis"
                          >
                            {{ getSongInstrumentUploadErrorMessage(song.id, instrument) }}
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

          </article>
        </div>
      </div>
    </div>

    <div
      v-if="activeSongInstrumentFormSong"
      ref="songInstrumentFormModalRef"
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`createSongInstrumentModalTitle-${activeSongInstrumentFormSong.id}`"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h4 :id="`createSongInstrumentModalTitle-${activeSongInstrumentFormSong.id}`" class="modal-title h5">
              {{ $t('dashboard.songs.addInstrumentModalTitle', { songTitle: activeSongInstrumentFormSong.title }) }}
            </h4>
            <button
              type="button"
              class="btn-close"
              :aria-label="$t('dashboard.songs.close')"
              :disabled="songInstrumentForms[activeSongInstrumentFormSong.id].isSubmitting"
              @click="closeSongInstrumentForm(activeSongInstrumentFormSong.id)"
            ></button>
          </div>
          <form
            :data-song-id="activeSongInstrumentFormSong.id"
            @submit.prevent="handleCreateSongInstrument(activeSongInstrumentFormSong.id)"
          >
            <div class="modal-body">
              <div class="row g-2">
                <div class="col-12">
                  <label :for="`songInstrumentName-${activeSongInstrumentFormSong.id}`" class="form-label mb-1">{{ $t('dashboard.songs.table.trackTitle') }}</label>
                  <input
                    :id="`songInstrumentName-${activeSongInstrumentFormSong.id}`"
                    v-model="songInstrumentForms[activeSongInstrumentFormSong.id].name"
                    type="text"
                    class="form-control form-control-sm"
                    :disabled="songInstrumentForms[activeSongInstrumentFormSong.id].isSubmitting"
                    required
                  >
                </div>
                <div class="col-12">
                  <label :for="`songInstrumentId-${activeSongInstrumentFormSong.id}`" class="form-label mb-1">{{ $t('dashboard.songs.table.instrument') }}</label>
                  <select
                    :id="`songInstrumentId-${activeSongInstrumentFormSong.id}`"
                    v-model="songInstrumentForms[activeSongInstrumentFormSong.id].instrumentId"
                    class="form-select form-select-sm"
                    :disabled="songInstrumentForms[activeSongInstrumentFormSong.id].isSubmitting"
                    required
                  >
                    <option value="" disabled>
                      {{ $t('dashboard.songs.selectInstrumentOption') }}
                    </option>
                    <option
                      v-for="instrument in availableInstruments"
                      :key="instrument.id.value"
                      :value="instrument.id.value"
                    >
                      {{ instrument.name.value }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="songInstrumentForms[activeSongInstrumentFormSong.id].isSubmitting"
                @click="closeSongInstrumentForm(activeSongInstrumentFormSong.id)"
              >
                {{ $t('dashboard.songs.cancel') }}
              </button>
              <button
                type="submit"
                class="btn btn-sm btn-primary"
                :disabled="songInstrumentForms[activeSongInstrumentFormSong.id].isSubmitting"
              >
                <span
                  v-if="songInstrumentForms[activeSongInstrumentFormSong.id].isSubmitting"
                  class="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                {{ songInstrumentForms[activeSongInstrumentFormSong.id].isSubmitting ? $t('dashboard.songs.addingLoading') : $t('dashboard.songs.saveInstrument') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="activeEditInstrumentModalContext && activeEditInstrumentModal"
      ref="editInstrumentModalRef"
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`editInstrumentModalTitle-${activeEditInstrumentModal.instrumentId}`"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h4 :id="`editInstrumentModalTitle-${activeEditInstrumentModal.instrumentId}`" class="modal-title h5">
              {{ $t('dashboard.songs.editInstrumentModalTitle', { name: activeEditInstrumentModal.name || getSongInstrumentDisplayName(activeEditInstrumentModalContext.instrument) }) }}
            </h4>
            <button
              type="button"
              class="btn-close"
              :aria-label="$t('dashboard.songs.close')"
              :disabled="activeEditInstrumentModal.isSubmitting"
              @click="closeEditInstrumentModal"
            ></button>
          </div>
          <form
            :data-song-id="`edit-${activeEditInstrumentModal.instrumentId}`"
            @submit.prevent="handleEditInstrumentSubmit"
          >
            <div class="modal-body d-grid gap-3">
              <div>
                <div class="fw-semibold">{{ activeEditInstrumentModalContext.song.title }}</div>
                <div class="text-muted small">{{ activeEditInstrumentModalContext.instrument.name }}</div>
              </div>

              <div v-if="activeEditInstrumentModal.isLoading" class="text-muted small d-flex align-items-center gap-2">
                <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                {{ $t('dashboard.songs.loadingInstrumentDetail') }}
              </div>

              <div v-else class="row g-3">
                <div class="col-12">
                  <label :for="`editInstrumentName-${activeEditInstrumentModal.instrumentId}`" class="form-label">{{ $t('dashboard.songs.table.trackTitle') }}</label>
                  <input
                    :id="`editInstrumentName-${activeEditInstrumentModal.instrumentId}`"
                    :value="activeEditInstrumentModal.name"
                    type="text"
                    class="form-control"
                    :disabled="activeEditInstrumentModal.isSubmitting"
                    required
                    @input="handleEditInstrumentNameInput"
                  >
                </div>
                <div class="col-12">
<label :for="`editInstrumentCatalogId-${activeEditInstrumentModal.instrumentId}`" class="form-label">{{ $t('dashboard.songs.table.instrument') }}</label>
                      <select
                        :id="`editInstrumentCatalogId-${activeEditInstrumentModal.instrumentId}`"
                        :value="activeEditInstrumentModal.catalogInstrumentId"
                        class="form-select"
                        :disabled="activeEditInstrumentModal.isSubmitting"
                        required
                        @change="handleEditInstrumentCatalogInput"
                      >
                        <option value="" disabled>
                          {{ $t('dashboard.songs.selectInstrumentOption') }}
                        </option>
                        <option
                          v-for="instrument in availableInstruments"
                          :key="instrument.id.value"
                          :value="instrument.id.value"
                        >
                          {{ instrument.name.value }}
                        </option>
                      </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="activeEditInstrumentModal.isSubmitting"
                @click="closeEditInstrumentModal"
              >
                {{ $t('dashboard.songs.cancel') }}
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="activeEditInstrumentModal.isLoading || activeEditInstrumentModal.isSubmitting"
              >
                <span
                  v-if="activeEditInstrumentModal.isSubmitting"
                  class="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                {{ activeEditInstrumentModal.isSubmitting ? $t('dashboard.songs.savingLoading') : $t('dashboard.songs.saveChanges') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="activeSongInstrumentUploadModalContext"
      ref="songInstrumentUploadModalRef"
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`uploadSongInstrumentModalTitle-${activeSongInstrumentUploadModalContext.instrument.id}`"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h4 :id="`uploadSongInstrumentModalTitle-${activeSongInstrumentUploadModalContext.instrument.id}`" class="modal-title h5">
              {{ $t('dashboard.songs.uploadModalTitle', { name: activeSongInstrumentUploadModalContext.instrument.name }) }}
            </h4>
            <button
              type="button"
              class="btn-close"
              :aria-label="$t('dashboard.songs.close')"
              @click="closeSongInstrumentUploadModal"
            ></button>
          </div>
          <form
            :data-song-id="`${activeSongInstrumentUploadModalContext.song.id}-${activeSongInstrumentUploadModalContext.instrument.id}`"
            @submit.prevent="handleUploadSongInstrumentVideo(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id)"
          >
            <div class="modal-body d-grid gap-3">
              <div>
                <div class="fw-semibold">{{ activeSongInstrumentUploadModalContext.song.title }}</div>
                <div class="text-muted small">{{ getSongInstrumentDisplayName(activeSongInstrumentUploadModalContext.instrument) }}</div>
              </div>
              <div v-if="shouldShowSongInstrumentUploadForm(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id)">
                <label :for="`songInstrumentVideo-${activeSongInstrumentUploadModalContext.song.id}-${activeSongInstrumentUploadModalContext.instrument.id}`" class="form-label">{{ $t('dashboard.songs.videoMp4Label') }}</label>
                <input
                  :id="`songInstrumentVideo-${activeSongInstrumentUploadModalContext.song.id}-${activeSongInstrumentUploadModalContext.instrument.id}`"
                  type="file"
                  accept="video/mp4"
                  class="form-control"
                  :disabled="isSongInstrumentUploadDisabled(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument)"
                  @change="handleSongInstrumentVideoSelection(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id, $event)"
                >
              </div>
              <div
                v-if="shouldShowSongInstrumentProgress(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id)"
              >
                <div
                  :data-testid="`upload-progress-${activeSongInstrumentUploadModalContext.song.id}-${activeSongInstrumentUploadModalContext.instrument.id}`"
                  class="progress"
                  role="progressbar"
                  :aria-label="$t('dashboard.songs.uploadProgressAriaLabel')"
                  :aria-valuenow="getSongInstrumentUploadState(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id).progress"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    class="progress-bar progress-bar-striped progress-bar-animated"
                    :class="getEffectiveVideo(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id) ? 'bg-success' : 'bg-primary'"
                    :style="{ width: `${getSongInstrumentUploadState(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id).progress}%` }"
                  >
                    {{ getSongInstrumentUploadState(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id).progress }}%
                  </div>
                </div>
              </div>
              <div
                    v-if="getSongInstrumentStatusMessage(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument)"
                    class="rounded-3 border mb-0 px-3 py-2 small"
                    :class="getEffectiveVideo(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id) ? 'border-success-subtle bg-success-subtle text-success-emphasis' : 'border-info-subtle bg-info-subtle text-info-emphasis'"
                  >
                {{ getSongInstrumentStatusMessage(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument) }}
              </div>
              <p
                    v-if="getSongInstrumentUploadErrorMessage(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument)"
                    class="mb-0 small text-danger-emphasis"
                  >
                    {{ getSongInstrumentUploadErrorMessage(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument) }}
                  </p>

            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="closeSongInstrumentUploadModal">
                {{ $t('dashboard.songs.close') }}
              </button>
              <button
                v-if="shouldShowSongInstrumentUploadForm(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id)"
                type="submit"
                class="btn btn-primary"
                :disabled="isSongInstrumentUploadSubmitDisabled(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument)"
              >
                <span
                  v-if="getSongInstrumentUploadState(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument.id).isSubmitting"
                  class="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                {{ getSongInstrumentSubmitLabel(activeSongInstrumentUploadModalContext.song.id, activeSongInstrumentUploadModalContext.instrument) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="activeAssignMusicianModalContext && activeAssignMusicianModal"
      ref="assignMusicianModalRef"
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`assignMusicianModalTitle-${activeAssignMusicianModalContext.instrument.id}`"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h4 :id="`assignMusicianModalTitle-${activeAssignMusicianModalContext.instrument.id}`" class="modal-title h5">
              {{ $t('dashboard.songs.assignModalTitle', { name: activeAssignMusicianModalContext.instrument.name }) }}
            </h4>
            <button
              type="button"
              class="btn-close"
              :aria-label="$t('dashboard.songs.close')"
              :disabled="activeAssignMusicianModal.isSubmitting"
              @click="closeAssignMusicianModal"
            ></button>
          </div>
          <form :aria-label="$t('dashboard.songs.inviteMusicianFormAriaLabel')" @submit.prevent="handleAssignMusicianSubmit">
            <div class="modal-body">
              <div>
                <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <h5 class="h6 mb-1">{{ $t('dashboard.songs.bandMembersTitle') }}</h5>
                    <p class="text-muted small mb-0">{{ $t('dashboard.songs.selectMemberHint') }}</p>
                  </div>
                  <span class="badge text-bg-light border">{{ activeAssignMusicianModal.members.length }}</span>
                </div>

                <p v-if="activeAssignMusicianModal.isLoadingMembers" class="text-muted small mb-0">
                  {{ $t('dashboard.songs.loadingMembers') }}
                </p>
                <p v-else-if="activeAssignMusicianModal.membersErrorMsg" class="text-muted small mb-0">
                  {{ activeAssignMusicianModal.membersErrorMsg }}
                </p>
                <p v-else-if="activeAssignMusicianModal.members.length === 0" class="text-muted small mb-0">
                  {{ $t('dashboard.songs.noMembersAvailable') }}
                </p>
                <ul v-else class="list-group list-group-flush">
                  <li
                    v-for="member in activeAssignMusicianModal.members"
                    :key="member.id"
                    class="list-group-item px-0 d-flex justify-content-between align-items-center gap-3"
                  >
                    <div>
                      <p class="fw-semibold mb-1">{{ member.name }}</p>
                      <p v-if="member.username" class="text-muted small mb-0">{{ member.username }}</p>
                    </div>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      :aria-label="$t('dashboard.songs.selectMemberAriaLabel', { name: member.name })"
                      :disabled="activeAssignMusicianModal.isSubmitting"
                      @click="handleAssignBandMemberSelection(member)"
                    >
                      {{ $t('dashboard.songs.select') }}
                    </button>
                  </li>
                </ul>
              </div>

              <div class="border-top mt-4 pt-3">
                <label :for="`assignMusicianEmail-${activeAssignMusicianModalContext.instrument.id}`" class="form-label">{{ $t('dashboard.songs.musicianEmailLabel') }}</label>
                <input
                  :id="`assignMusicianEmail-${activeAssignMusicianModalContext.instrument.id}`"
                  :value="activeAssignMusicianModal.email"
                  type="email"
                  class="form-control"
                  placeholder="musico@ejemplo.com"
                  :disabled="activeAssignMusicianModal.isSubmitting"
                  @input="handleAssignMusicianEmailInput"
                >
                <p class="text-muted small mt-2 mb-0">
                  {{ $t('dashboard.songs.inviteHint') }}
                </p>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" :disabled="activeAssignMusicianModal.isSubmitting" @click="closeAssignMusicianModal">
                {{ $t('dashboard.songs.cancel') }}
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="activeAssignMusicianModal.isSubmitting || !isInviteEmailValid"
              >
                {{ $t('dashboard.songs.inviteByEmail') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div v-if="isAnyModalOpen" class="modal-backdrop show"></div>

    <div
      v-if="isCreateSongModalOpen"
      ref="createSongModalRef"
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="createSongModalTitle"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="createSongModalTitle" class="modal-title h5">{{ $t('dashboard.songs.createSong') }}</h2>
            <button
              type="button"
              class="btn-close"
              :aria-label="$t('dashboard.songs.close')"
              :disabled="isLoading"
              @click="closeCreateSongModal"
            ></button>
          </div>

          <form
            data-testid="create-song-form"
            @submit.prevent="handleCreateSong"
          >
            <div class="modal-body">
              <div class="mb-3">
                <label for="songTitle" class="form-label">{{ $t('dashboard.songs.titleLabel') }}</label>
                <input
                  id="songTitle"
                  v-model="title"
                  type="text"
                  class="form-control"
                  :placeholder="$t('dashboard.songs.titlePlaceholder')"
                  :disabled="isLoading"
                  required
                >
              </div>

              <div>
                <label for="originalVideoclipUrl" class="form-label">{{ $t('dashboard.songs.originalVideoclipUrlLabel') }}</label>
                <input
                  id="originalVideoclipUrl"
                  v-model="originalVideoclipUrl"
                  type="url"
                  class="form-control"
                  :placeholder="$t('dashboard.songs.originalVideoclipUrlPlaceholder')"
                  :disabled="isLoading"
                  required
                >
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="isLoading"
                @click="closeCreateSongModal"
              >
                {{ $t('dashboard.songs.cancel') }}
              </button>
              <button type="submit" class="btn btn-primary" :disabled="!canSubmit">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                {{ isLoading ? $t('dashboard.songs.creatingLoading') : $t('dashboard.songs.createSong') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div v-if="isCreateSongModalOpen" class="modal-backdrop show"></div>

    <div v-if="activeVideoPreview" class="modal-backdrop show"></div>
    <div
      v-if="activeVideoPreview"
      ref="videoPreviewModalRef"
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="videoPreviewModalTitle"
      @click.self="closeVideoPreview"
    >
      <div class="modal-dialog modal-dialog-centered video-preview-dialog">
        <div class="modal-content video-preview-content">
          <div class="modal-header video-preview-header">
            <h2 id="videoPreviewModalTitle" class="modal-title h6 text-truncate">
              {{ activeVideoPreview.title }}
            </h2>
            <button
              type="button"
              class="btn-close btn-close-white"
              :aria-label="$t('dashboard.songs.close')"
              @click="closeVideoPreview"
            ></button>
          </div>
          <div class="modal-body p-0">
            <video
              :key="activeVideoPreview.url"
              data-testid="video-preview-player"
              :src="activeVideoPreview.url"
              controls
              class="video-preview-player"
            ></video>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-preview-dialog {
	width: auto;
	max-width: min(92vw, 1280px);
}

.video-preview-content {
	width: fit-content;
	max-width: 100%;
	margin-inline: auto;
	background: #000;
}

.video-preview-header {
	border-bottom-color: rgba(255, 255, 255, 0.15);
}

.video-preview-player {
	display: block;
	max-width: 100%;
	max-height: 80vh;
	width: auto;
	height: auto;
}

.song-instrument-action-wrapper {
	line-height: 0;
}

.song-instrument-action {
	min-width: 2.85rem;
	height: 2rem;
	padding-inline: 0.8rem;
}

.song-instrument-action :deep(.bi) {
	font-size: 0.85rem;
	line-height: 1;
}
</style>

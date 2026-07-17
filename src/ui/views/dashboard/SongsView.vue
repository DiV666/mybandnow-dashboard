<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { CreateSongInstrumentUseCase } from "../../../application/song/CreateSongInstrumentUseCase.js";
import { CreateSongUseCase } from "../../../application/song/CreateSongUseCase.js";
import { GetBandSongsUseCase } from "../../../application/song/GetBandSongsUseCase.js";
import { GetSongInstrumentDetailUseCase } from "../../../application/song/GetSongInstrumentDetailUseCase.js";
import { GetSongInstrumentsUseCase } from "../../../application/song/GetSongInstrumentsUseCase.js";
import { UploadSongInstrumentVideoUseCase } from "../../../application/song/UploadSongInstrumentVideoUseCase.js";
import {
	songInstrumentUploadStatuses,
	type SongInstrumentDetailResponse,
	type SongInstrumentListItemResponse,
	type SongInstrumentUploadResponse,
	type SongInstrumentVideoResponse,
} from "../../../domain/song/SongInstrumentResponse.js";
import type { SongResponse } from "../../../domain/song/SongResponse.js";
import { AxiosSongRepository } from "../../../infrastructure/song/AxiosSongRepository.js";
import { useBandStore } from "../../stores/useBandStore.js";
import { useMusicianStore } from "../../stores/useMusicianStore.js";

interface HttpErrorData {
	message?: string;
	errorMessage?: string;
	code?: string;
}

interface HttpErrorResponse {
	status?: number;
	data?: HttpErrorData;
}

interface HttpErrorLike {
	response?: HttpErrorResponse;
	message?: string;
	name?: string;
	code?: string;
}

interface SongInstrumentFormState {
	isVisible: boolean;
	name: string;
	instrumentType: string;
	isSubmitting: boolean;
	errorMsg: string;
}

interface SongInstrumentUploadState {
	selectedFile: File | null;
	isSubmitting: boolean;
	successMsg: string;
	errorMsg: string;
}

interface FileInputLike {
	files?: FileList | File[] | null;
}

interface UploadErrorDetails {
	message?: string;
	code?: string;
	status?: number;
	name?: string;
}

type SongInstrumentMap = Record<string, SongInstrumentListItemResponse[]>;
type SongInstrumentFormMap = Record<string, SongInstrumentFormState>;
type SongInstrumentUploadMap = Record<string, SongInstrumentUploadState>;
type SongInstrumentDetailMap = Record<string, SongInstrumentDetailResponse>;

const SONG_INSTRUMENT_POLL_INTERVAL_MS = 5000;

const bandStore = useBandStore();
const musicianStore = useMusicianStore();
const title = ref("");
const originalVideoclipUrl = ref("");
const errorMsg = ref("");
const songsErrorMsg = ref("");
const successMsg = ref("");
const isCreateSongModalOpen = ref(false);
const isLoading = ref(false);
const isLoadingSongs = ref(false);
const songs = ref<SongResponse[]>([]);
const songInstruments = ref<SongInstrumentMap>({});
const songInstrumentForms = ref<SongInstrumentFormMap>({});
const songInstrumentUploads = ref<SongInstrumentUploadMap>({});
const songInstrumentDetails = ref<SongInstrumentDetailMap>({});

const songRepository = new AxiosSongRepository();
const createSongUseCase = new CreateSongUseCase(songRepository);
const getBandSongsUseCase = new GetBandSongsUseCase(songRepository);
const createSongInstrumentUseCase = new CreateSongInstrumentUseCase(songRepository);
const getSongInstrumentsUseCase = new GetSongInstrumentsUseCase(songRepository);
const getSongInstrumentDetailUseCase = new GetSongInstrumentDetailUseCase(
	songRepository,
);
const uploadSongInstrumentVideoUseCase = new UploadSongInstrumentVideoUseCase(songRepository);

const selectedBand = computed(() => bandStore.selectedBand);
const canSubmit = computed(
	() => !isLoading.value && selectedBand.value !== null,
);

const songInstrumentPollTimeouts = new Map<
	string,
	ReturnType<typeof setTimeout>
>();
const songInstrumentPollVersions = new Map<string, number>();
let isViewMounted = true;
let lastSongsRequestId = 0;

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
	return typeof error === "object" && error !== null;
}

function getSongInstrumentForm(songId: string): SongInstrumentFormState {
	const current = songInstrumentForms.value[songId];
	if (current) {
		return current;
	}

	const nextState: SongInstrumentFormState = {
		isVisible: false,
		name: "",
		instrumentType: "",
		isSubmitting: false,
		errorMsg: "",
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
		successMsg: "",
		errorMsg: "",
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

function setSongInstrumentForm(
	songId: string,
	updates: Partial<SongInstrumentFormState>,
): void {
	const current = getSongInstrumentForm(songId);
	songInstrumentForms.value = {
		...songInstrumentForms.value,
		[songId]: {
			...current,
			...updates,
		},
	};
}

function getSongInstrumentDetail(
	songId: string,
	instrumentId: string,
): SongInstrumentDetailResponse | null {
	return songInstrumentDetails.value[getSongInstrumentUploadKey(songId, instrumentId)] ?? null;
}

function setSongInstrumentDetail(detail: SongInstrumentDetailResponse): void {
	const key = getSongInstrumentUploadKey(detail.songId, detail.id);
	songInstrumentDetails.value = {
		...songInstrumentDetails.value,
		[key]: detail,
	};

	const instruments = songInstruments.value[detail.songId] ?? [];
	songInstruments.value = {
		...songInstruments.value,
		[detail.songId]: instruments.map((instrument) =>
			instrument.id === detail.id
				? {
					...instrument,
					upload: detail.upload,
				}
				: instrument,
		),
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

function getEffectiveUpload(
	songId: string,
	instrument: SongInstrumentListItemResponse,
): SongInstrumentUploadResponse | null {
	return getSongInstrumentDetail(songId, instrument.id)?.upload ?? instrument.upload;
}

function getEffectiveVideo(
	songId: string,
	instrumentId: string,
): SongInstrumentVideoResponse | null {
	return getSongInstrumentDetail(songId, instrumentId)?.video ?? null;
}

function isSongInstrumentInProgress(
	upload: SongInstrumentUploadResponse | null,
): boolean {
	return (
		upload?.status === songInstrumentUploadStatuses.PENDING ||
		upload?.status === songInstrumentUploadStatuses.READY ||
		upload?.status === songInstrumentUploadStatuses.PROCESSING
	);
}

function isSongStillVisible(songId: string): boolean {
	return songs.value.some((song) => song.id === songId);
}

function cancelSongInstrumentPoll(songId: string, instrumentId: string): void {
	const key = getSongInstrumentUploadKey(songId, instrumentId);
	const timeoutId = songInstrumentPollTimeouts.get(key);
	if (timeoutId) {
		clearTimeout(timeoutId);
		songInstrumentPollTimeouts.delete(key);
	}
	songInstrumentPollVersions.set(
		key,
		(songInstrumentPollVersions.get(key) ?? 0) + 1,
	);
}

function cancelAllSongInstrumentPolls(): void {
	for (const timeoutId of songInstrumentPollTimeouts.values()) {
		clearTimeout(timeoutId);
	}
	songInstrumentPollTimeouts.clear();
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
			(typeof error.message === "string" ? error.message : undefined),
		code:
			data?.code ??
			(typeof error.code === "string" ? error.code : undefined),
		status: response?.status,
		name: typeof error.name === "string" ? error.name : undefined,
	};
}

function mapUploadErrorMessage(
	details: UploadErrorDetails,
	fallbackMessage: string,
): string {
	const message = details.message?.toLowerCase() ?? "";
	const code = details.code?.toLowerCase() ?? "";
	const combined = `${code} ${message}`;

	if (combined.includes("songinstrument_not_exists")) {
		return "No se encontró el instrumento al que intentabas subir el vídeo.";
	}

	if (combined.includes("no video file provided")) {
		return "Seleccioná un vídeo antes de continuar.";
	}

	if (combined.includes("content-type must be video/mp4")) {
		return "El vídeo tiene que estar en formato MP4.";
	}

	if (
		combined.includes("invalid file format") ||
		combined.includes("corrupted header")
	) {
		return "El archivo no es un MP4 válido o está dañado.";
	}

	if (combined.includes("video file exceeds")) {
		return "El archivo supera el tamaño máximo permitido.";
	}

	if (
		details.name === "AbortError" ||
		combined.includes("upload aborted by client") ||
		combined.includes("aborted") ||
		combined.includes("canceled")
	) {
		return "La subida se canceló antes de terminar.";
	}

	if (combined.includes("profile required")) {
		return "Necesitás crear tu perfil antes de subir vídeos.";
	}

	if (
		combined.includes(
			"only the assigned musician can upload for this song instrument",
		)
	) {
		return "Solo la persona asignada a este instrumento puede subir el vídeo.";
	}

	if (details.status === 403) {
		return "Solo la persona asignada a este instrumento puede subir el vídeo.";
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
			"La subida del vídeo falló.",
		);
	}

	return "";
}

function getSongInstrumentStatusMessage(
	songId: string,
	instrument: SongInstrumentListItemResponse,
): string {
	const uploadState = getSongInstrumentUploadState(songId, instrument.id);
	const video = getEffectiveVideo(songId, instrument.id);
	if (video) {
		return uploadState.successMsg || "Video disponible.";
	}

	const upload = getEffectiveUpload(songId, instrument);
	if (uploadState.isSubmitting) {
		return "Procesando video...";
	}

	if (upload?.status === songInstrumentUploadStatuses.PENDING) {
		return "Subida pendiente...";
	}

	if (upload?.status === songInstrumentUploadStatuses.READY) {
		return "Video recibido. Esperando procesamiento...";
	}

	if (upload?.status === songInstrumentUploadStatuses.PROCESSING) {
		return "Procesando video...";
	}

	if (upload?.status === songInstrumentUploadStatuses.COMPLETED) {
		return "Finalizando disponibilidad del video...";
	}

	return uploadState.successMsg;
}

function shouldShowSongInstrumentUploadForm(
	songId: string,
	instrumentId: string,
): boolean {
	return getEffectiveVideo(songId, instrumentId) === null;
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
		isSongInstrumentUploadDisabled(songId, instrument) ||
		uploadState.selectedFile === null
	);
}

function getSongInstrumentSubmitLabel(
	songId: string,
	instrument: SongInstrumentListItemResponse,
): string {
	if (isSongInstrumentUploadDisabled(songId, instrument)) {
		return "Procesando...";
	}

	if (
		getEffectiveUpload(songId, instrument)?.status ===
		songInstrumentUploadStatuses.FAILED
	) {
		return "Reintentar subida";
	}

	return "Subir video";
}

async function refreshSongInstrumentDetail(
	songId: string,
	instrumentId: string,
): Promise<SongInstrumentDetailResponse> {
	const detail = await getSongInstrumentDetailUseCase.run(songId, instrumentId);
	if (isViewMounted && isSongStillVisible(songId)) {
		setSongInstrumentDetail(detail);
	}
	return detail;
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
	if (
		!isViewMounted ||
		!isSongStillVisible(songId) ||
		songInstrumentPollVersions.get(key) !== version
	) {
		return;
	}

	try {
		const detail = await refreshSongInstrumentDetail(songId, instrumentId);
		if (
			!isViewMounted ||
			!isSongStillVisible(songId) ||
			songInstrumentPollVersions.get(key) !== version
		) {
			return;
		}

		if (isSongInstrumentInProgress(detail.upload)) {
			scheduleSongInstrumentPoll(songId, instrumentId, 1);
			return;
		}

		if (
			detail.upload?.status === songInstrumentUploadStatuses.COMPLETED &&
			detail.video === null &&
			extraReadsAfterCompletedWithoutVideo > 0
		) {
			scheduleSongInstrumentPoll(
				songId,
				instrumentId,
				extraReadsAfterCompletedWithoutVideo - 1,
			);
			return;
		}

		cancelSongInstrumentPoll(songId, instrumentId);
		setSongInstrumentUploadState(songId, instrumentId, {
			isSubmitting: false,
			successMsg: detail.video ? "Video disponible." : "",
			errorMsg: detail.video ? "" : undefined,
		});
	} catch (error: unknown) {
		cancelSongInstrumentPoll(songId, instrumentId);
		setSongInstrumentUploadState(songId, instrumentId, {
			isSubmitting: false,
			successMsg: "",
			errorMsg: mapUploadErrorMessage(
				extractUploadErrorDetails(error),
				"No pudimos actualizar el estado del video.",
			),
		});
	}
}

async function syncSongInstrumentAsyncState(
	songId: string,
	instrument: SongInstrumentListItemResponse,
): Promise<void> {
	if (isSongInstrumentInProgress(instrument.upload)) {
		setSongInstrumentUploadState(songId, instrument.id, {
			isSubmitting: true,
			successMsg: "",
			errorMsg: "",
		});
		scheduleSongInstrumentPoll(songId, instrument.id, 1);
		return;
	}

	if (instrument.upload?.status === songInstrumentUploadStatuses.COMPLETED) {
		const detail = await refreshSongInstrumentDetail(songId, instrument.id);
		if (detail.video === null) {
			setSongInstrumentUploadState(songId, instrument.id, {
				isSubmitting: true,
				successMsg: "",
				errorMsg: "",
			});
			scheduleSongInstrumentPoll(songId, instrument.id, 1);
			return;
		}
	}

	setSongInstrumentUploadState(songId, instrument.id, {
		isSubmitting: false,
		successMsg: "",
		errorMsg: "",
	});
}

async function loadSongInstruments(
	songList: SongResponse[],
	requestId: number,
): Promise<void> {
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
		songsErrorMsg.value = "";
		isLoadingSongs.value = false;
		return;
	}

	isLoadingSongs.value = true;
	songsErrorMsg.value = "";
	songInstrumentDetails.value = {};

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
	} catch (error: unknown) {
		if (requestId !== lastSongsRequestId || !isViewMounted) {
			return;
		}

		songs.value = [];
		songInstruments.value = {};
		songInstrumentForms.value = {};
		songInstrumentUploads.value = {};
		songInstrumentDetails.value = {};
		songsErrorMsg.value =
			error instanceof Error
				? error.message
				: "Ocurrió un error inesperado al cargar las canciones.";
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

onBeforeUnmount(() => {
	isViewMounted = false;
	cancelAllSongInstrumentPolls();
});

function resetCreateSongForm(): void {
	title.value = "";
	originalVideoclipUrl.value = "";
	errorMsg.value = "";
}

function openCreateSongModal(): void {
	if (!selectedBand.value || isLoading.value) {
		return;
	}

	errorMsg.value = "";
	successMsg.value = "";
	isCreateSongModalOpen.value = true;
}

function closeCreateSongModal(): void {
	isCreateSongModalOpen.value = false;
	resetCreateSongForm();
}

async function handleCreateSong() {
	errorMsg.value = "";
	successMsg.value = "";

	if (!selectedBand.value) {
		errorMsg.value = "Selecciona una banda antes de crear una canción.";
		return;
	}

	isLoading.value = true;

	try {
		const bandId = selectedBand.value.id.value;
		await createSongUseCase.run(
			bandId,
			crypto.randomUUID(),
			title.value,
			originalVideoclipUrl.value,
		);

		resetCreateSongForm();
		isCreateSongModalOpen.value = false;
		successMsg.value = "Canción creada correctamente.";
		if (selectedBand.value?.id.value === bandId) {
			await loadSongs(bandId);
		}
	} catch (error: unknown) {
		if (isHttpErrorLike(error) && error.response?.status === 409) {
			errorMsg.value = "Ya existe una canción con esos datos. Inténtalo de nuevo.";
		} else if (error instanceof Error) {
			errorMsg.value = error.message;
		} else {
			errorMsg.value = "Ocurrió un error inesperado al crear la canción.";
		}
	} finally {
		isLoading.value = false;
	}
}

function toggleSongInstrumentForm(songId: string): void {
	const current = getSongInstrumentForm(songId);
	setSongInstrumentForm(songId, {
		isVisible: !current.isVisible,
		errorMsg: "",
	});
}

function handleSongInstrumentVideoSelection(
	songId: string,
	instrumentId: string,
	event: Event,
): void {
	const target = event.target;
	const selectedFile =
		target && typeof target === "object" && "files" in target
			? ((target as FileInputLike).files?.[0] ?? null)
			: null;

	if (!selectedFile) {
		setSongInstrumentUploadState(songId, instrumentId, {
			selectedFile: null,
			successMsg: "",
			errorMsg: "Seleccioná un vídeo antes de continuar.",
		});
		return;
	}

	if (selectedFile.type !== "video/mp4") {
		setSongInstrumentUploadState(songId, instrumentId, {
			selectedFile: null,
			successMsg: "",
			errorMsg: "El vídeo tiene que estar en formato MP4.",
		});
		return;
	}

	setSongInstrumentUploadState(songId, instrumentId, {
		selectedFile,
		successMsg: "",
		errorMsg: "",
	});
}

async function handleUploadSongInstrumentVideo(
	songId: string,
	instrumentId: string,
): Promise<void> {
	const uploadState = getSongInstrumentUploadState(songId, instrumentId);
	if (!uploadState.selectedFile) {
		setSongInstrumentUploadState(songId, instrumentId, {
			errorMsg:
				uploadState.errorMsg || "Seleccioná un vídeo antes de continuar.",
			successMsg: "",
		});
		return;
	}

	setSongInstrumentUploadState(songId, instrumentId, {
		isSubmitting: true,
		errorMsg: "",
		successMsg: "",
	});
	setSongInstrumentUploadStatus(songId, instrumentId, {
		status: songInstrumentUploadStatuses.PENDING,
	});

	try {
		await uploadSongInstrumentVideoUseCase.run(
			songId,
			instrumentId,
			uploadState.selectedFile,
		);
		setSongInstrumentUploadState(songId, instrumentId, {
			selectedFile: null,
			isSubmitting: true,
			successMsg: "",
		});
		scheduleSongInstrumentPoll(songId, instrumentId, 1);
	} catch (error: unknown) {
		setSongInstrumentUploadState(songId, instrumentId, {
			errorMsg: mapUploadErrorMessage(
				extractUploadErrorDetails(error),
				"No se pudo iniciar la subida del vídeo.",
			),
			isSubmitting: false,
			successMsg: "",
		});
		setSongInstrumentUploadStatus(songId, instrumentId, null);
	}
}

async function handleCreateSongInstrument(songId: string): Promise<void> {
	const musicianProfileId = musicianStore.profile?.id;
	if (!musicianProfileId) {
		setSongInstrumentForm(songId, {
			errorMsg: "Debes completar tu perfil de músico para añadir instrumentos.",
		});
		return;
	}

	const form = getSongInstrumentForm(songId);
	setSongInstrumentForm(songId, {
		isSubmitting: true,
		errorMsg: "",
	});

	try {
		await createSongInstrumentUseCase.run(
			songId,
			crypto.randomUUID(),
			form.name,
			form.instrumentType,
			musicianProfileId,
		);
		const instruments = await getSongInstrumentsUseCase.run(songId);
		songInstruments.value = {
			...songInstruments.value,
			[songId]: instruments,
		};
		await Promise.all(
			instruments.map((instrument) => syncSongInstrumentAsyncState(songId, instrument)),
		);
		setSongInstrumentForm(songId, {
			isVisible: false,
			name: "",
			instrumentType: "",
			isSubmitting: false,
		});
	} catch (error: unknown) {
		if (isHttpErrorLike(error) && error.response?.status === 409) {
			setSongInstrumentForm(songId, {
				errorMsg:
					"Ya existe un instrumento con esos datos para esta canción. Inténtalo de nuevo.",
				isSubmitting: false,
			});
			return;
		}

		if (isHttpErrorLike(error) && error.response?.status === 403) {
			setSongInstrumentForm(songId, {
				errorMsg:
					"No tienes permisos para añadir instrumentos a esta canción.",
				isSubmitting: false,
			});
			return;
		}

		setSongInstrumentForm(songId, {
			errorMsg:
				error instanceof Error
					? error.message
					: "Ocurrió un error inesperado al añadir el instrumento.",
			isSubmitting: false,
		});
	} finally {
		if (hasSongInstrumentForm(songId) && getSongInstrumentForm(songId).isSubmitting) {
			setSongInstrumentForm(songId, {
				isSubmitting: false,
			});
		}
	}
}
</script>

<template>
  <div>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <div>
        <h1 class="h2">Gestión de Canciones (Songs / Tracks)</h1>
        <p class="text-muted mb-0">
          Crea una canción dentro de la banda seleccionada.
        </p>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <p class="mb-3">
          <strong>Banda seleccionada:</strong>
          <span v-if="selectedBand">{{ selectedBand.name.value }}</span>
          <span v-else>No hay banda seleccionada.</span>
        </p>

        <div v-if="!selectedBand" class="alert alert-warning" role="alert">
          Debes seleccionar una banda para crear canciones.
        </div>

        <div v-if="successMsg" class="alert alert-success" role="alert">
          {{ successMsg }}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
          <div>
            <h2 class="h5 mb-0">Canciones de la banda</h2>
            <span v-if="selectedBand && !isLoadingSongs" class="text-muted small">
              {{ songs.length }} canciones
            </span>
          </div>

          <button
            type="button"
            class="btn btn-primary"
            :disabled="!canSubmit"
            @click="openCreateSongModal"
          >
            Crear canción
          </button>
        </div>

        <p v-if="!selectedBand" class="text-muted mb-0">
          Selecciona una banda para ver sus canciones.
        </p>

        <p v-else-if="isLoadingSongs" class="text-muted mb-0">
          Cargando canciones...
        </p>

        <div v-else-if="songsErrorMsg" class="alert alert-danger mb-0" role="alert">
          {{ songsErrorMsg }}
        </div>

        <p v-else-if="songs.length === 0" class="text-muted mb-0">
          Esta banda todavía no tiene canciones.
        </p>

        <div v-else class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Videoclip original</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="song in songs" :key="song.id">
                <td>
                  <div class="fw-semibold">{{ song.title }}</div>
                  <div class="mt-2">
                    <button type="button" class="btn btn-outline-secondary btn-sm" @click="toggleSongInstrumentForm(song.id)">
                      Añadir instrumento
                    </button>
                  </div>
                  <form
                    v-if="songInstrumentForms[song.id]?.isVisible"
                    :data-song-id="song.id"
                    class="row g-2 mt-2"
                    @submit.prevent="handleCreateSongInstrument(song.id)"
                  >
                    <div class="col-12 col-md-6">
                      <label :for="`songInstrumentName-${song.id}`" class="form-label mb-1">Nombre del instrumento</label>
                      <input
                        :id="`songInstrumentName-${song.id}`"
                        v-model="songInstrumentForms[song.id].name"
                        type="text"
                        class="form-control form-control-sm"
                        :disabled="songInstrumentForms[song.id].isSubmitting"
                        required
                      >
                    </div>
                    <div class="col-12 col-md-6">
                      <label :for="`songInstrumentType-${song.id}`" class="form-label mb-1">Tipo de instrumento</label>
                      <input
                        :id="`songInstrumentType-${song.id}`"
                        v-model="songInstrumentForms[song.id].instrumentType"
                        type="text"
                        class="form-control form-control-sm"
                        :disabled="songInstrumentForms[song.id].isSubmitting"
                        required
                      >
                    </div>
                    <div v-if="songInstrumentForms[song.id].errorMsg" class="col-12">
                      <div class="alert alert-danger mb-0 py-2" role="alert">
                        {{ songInstrumentForms[song.id].errorMsg }}
                      </div>
                    </div>
                    <div class="col-12">
                      <button
                        type="submit"
                        class="btn btn-sm btn-primary"
                        :disabled="songInstrumentForms[song.id].isSubmitting"
                      >
                        <span
                          v-if="songInstrumentForms[song.id].isSubmitting"
                          class="spinner-border spinner-border-sm me-2"
                          aria-hidden="true"
                        ></span>
                        {{ songInstrumentForms[song.id].isSubmitting ? 'Añadiendo...' : 'Guardar instrumento' }}
                      </button>
                    </div>
                  </form>
                  <div class="mt-3">
                    <h3 class="h6">Instrumentos</h3>
                    <p v-if="(songInstruments[song.id] ?? []).length === 0" class="text-muted mb-0 small">
                      Esta canción todavía no tiene instrumentos.
                    </p>
                    <ul v-else class="list-unstyled mb-0 small">
                      <li v-for="instrument in songInstruments[song.id]" :key="instrument.id" class="mb-3">
                        <div class="fw-semibold">
                          {{ instrument.name }} · {{ instrument.instrumentType }}
                        </div>
                        <form
                          v-if="shouldShowSongInstrumentUploadForm(song.id, instrument.id)"
                          :data-song-id="`${song.id}-${instrument.id}`"
                          class="row g-2 mt-1"
                          @submit.prevent="handleUploadSongInstrumentVideo(song.id, instrument.id)"
                        >
                          <div class="col-12 col-md-8">
                            <label :for="`songInstrumentVideo-${song.id}-${instrument.id}`" class="form-label mb-1">
                              Video MP4
                            </label>
                            <input
                              :id="`songInstrumentVideo-${song.id}-${instrument.id}`"
                              type="file"
                              accept="video/mp4"
                              class="form-control form-control-sm"
                              :disabled="isSongInstrumentUploadDisabled(song.id, instrument)"
                              @change="handleSongInstrumentVideoSelection(song.id, instrument.id, $event)"
                            >
                          </div>
                          <div class="col-12 col-md-4 d-flex align-items-end">
                            <button
                              type="submit"
                              class="btn btn-sm btn-outline-primary"
                              :disabled="isSongInstrumentUploadSubmitDisabled(song.id, instrument)"
                            >
                              <span
                                v-if="isSongInstrumentUploadDisabled(song.id, instrument)"
                                class="spinner-border spinner-border-sm me-2"
                                aria-hidden="true"
                              ></span>
                              {{ getSongInstrumentSubmitLabel(song.id, instrument) }}
                            </button>
                          </div>
                        </form>
                        <div
                          v-if="getSongInstrumentStatusMessage(song.id, instrument)"
                          class="alert mb-0 mt-2 py-2"
                          :class="getEffectiveVideo(song.id, instrument.id) ? 'alert-success' : 'alert-info'"
                          role="alert"
                        >
                          {{ getSongInstrumentStatusMessage(song.id, instrument) }}
                        </div>
                        <div v-if="getEffectiveVideo(song.id, instrument.id)" class="mt-2">
                          <a
                            :href="getEffectiveVideo(song.id, instrument.id)?.url"
                            target="_blank"
                            rel="noreferrer noopener"
                            class="btn btn-sm btn-outline-success"
                          >
                            Ver video
                          </a>
                        </div>
                        <div
                          v-if="getSongInstrumentUploadErrorMessage(song.id, instrument)"
                          class="alert alert-danger mb-0 mt-2 py-2"
                          role="alert"
                        >
                          {{ getSongInstrumentUploadErrorMessage(song.id, instrument) }}
                        </div>
                      </li>
                    </ul>
                  </div>
                </td>
                <td>
                  <a :href="song.originalVideoclipUrl" target="_blank" rel="noreferrer noopener">
                    {{ song.originalVideoclipUrl }}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div
      v-if="isCreateSongModalOpen"
      class="modal d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="createSongModalTitle"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="createSongModalTitle" class="modal-title h5">Crear canción</h2>
            <button
              type="button"
              class="btn-close"
              aria-label="Cerrar"
              :disabled="isLoading"
              @click="closeCreateSongModal"
            ></button>
          </div>

          <form
            data-testid="create-song-form"
            @submit.prevent="handleCreateSong"
          >
            <div class="modal-body">
              <div v-if="errorMsg" class="alert alert-danger" role="alert">
                {{ errorMsg }}
              </div>

              <div class="mb-3">
                <label for="songTitle" class="form-label">Título</label>
                <input
                  id="songTitle"
                  v-model="title"
                  type="text"
                  class="form-control"
                  placeholder="Ej. Paint It Black"
                  :disabled="isLoading"
                  required
                >
              </div>

              <div>
                <label for="originalVideoclipUrl" class="form-label">URL del videoclip original</label>
                <input
                  id="originalVideoclipUrl"
                  v-model="originalVideoclipUrl"
                  type="url"
                  class="form-control"
                  placeholder="https://www.youtube.com/watch?v=..."
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
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" :disabled="!canSubmit">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                {{ isLoading ? 'Creando...' : 'Crear canción' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div v-if="isCreateSongModalOpen" class="modal-backdrop show"></div>
  </div>
</template>

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
import { GetBandMembersUseCase } from "../../../application/band/GetBandMembersUseCase.js";
import { GetInstrumentByIdUseCase } from "../../../application/instrument/GetInstrumentByIdUseCase.js";
import { GetInstrumentsUseCase } from "../../../application/instrument/GetInstrumentsUseCase.js";
import { GetMusicianByIdUseCase } from "../../../application/musician/GetMusicianByIdUseCase.js";
import { AssignSongInstrumentMusicianUseCase } from "../../../application/song/AssignSongInstrumentMusicianUseCase.js";
import { CreateSongInstrumentUseCase } from "../../../application/song/CreateSongInstrumentUseCase.js";
import { CreateSongUseCase } from "../../../application/song/CreateSongUseCase.js";
import { GetBandSongsUseCase } from "../../../application/song/GetBandSongsUseCase.js";
import { GetSongInstrumentDetailUseCase } from "../../../application/song/GetSongInstrumentDetailUseCase.js";
import { GetSongInstrumentsUseCase } from "../../../application/song/GetSongInstrumentsUseCase.js";
import { InviteSongInstrumentMusicianUseCase } from "../../../application/song/InviteSongInstrumentMusicianUseCase.js";
import { UpdateSongInstrumentUseCase } from "../../../application/song/UpdateSongInstrumentUseCase.js";
import { UploadSongInstrumentVideoUseCase } from "../../../application/song/UploadSongInstrumentVideoUseCase.js";
import type { BandMemberResponse } from "../../../domain/band/BandMemberResponse.js";
import type { InstrumentResponse } from "../../../domain/instrument/InstrumentResponse.js";
import {
	songInstrumentUploadStatuses,
	type SongInstrumentDetailResponse,
	type SongInstrumentListItemResponse,
	type SongInstrumentUploadResponse,
	type SongInstrumentVideoResponse,
} from "../../../domain/song/SongInstrumentResponse.js";
import type { SongResponse } from "../../../domain/song/SongResponse.js";
import { AxiosBandRepository } from "../../../infrastructure/band/AxiosBandRepository.js";
import { AxiosInstrumentRepository } from "../../../infrastructure/instrument/AxiosInstrumentRepository.js";
import { AxiosMusicianRepository } from "../../../infrastructure/musician/AxiosMusicianRepository.js";
import { AxiosSongRepository } from "../../../infrastructure/song/AxiosSongRepository.js";
import { useBandStore } from "../../stores/useBandStore.js";
import { useMusicianStore } from "../../stores/useMusicianStore.js";
import { useToastStore } from "../../stores/useToastStore.js";

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
	instrumentId: string;
	isSubmitting: boolean;
	errorMsg: string;
}

const songInstrumentUploadProgressStages = {
	IDLE: "IDLE",
	REQUEST: "REQUEST",
	BACKEND: "BACKEND",
	COMPLETE: "COMPLETE",
} as const;

type SongInstrumentUploadProgressStage =
	(typeof songInstrumentUploadProgressStages)[keyof typeof songInstrumentUploadProgressStages];

interface SongInstrumentUploadState {
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

interface AssignableBandMemberViewModel {
	id: string;
	name: string;
	username: string;
}

interface AssignMusicianModalState {
	songId: string;
	instrumentId: string;
	email: string;
	isSubmitting: boolean;
	errorMsg: string;
	members: AssignableBandMemberViewModel[];
	isLoadingMembers: boolean;
	membersErrorMsg: string;
}

interface EditInstrumentModalState {
	songId: string;
	instrumentId: string;
	name: string;
	catalogInstrumentId: string;
	isLoading: boolean;
	isSubmitting: boolean;
	errorMsg: string;
}

interface FileInputLike {
	files?: FileList | File[] | null;
}

interface TextInputLike {
	value?: string;
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
type InstrumentNameMap = Record<string, string>;
type MusicianDisplayNameMap = Record<string, string>;
type TooltipTarget = Element;
type TooltipInstance = {
	dispose: () => void;
};

const SONG_INSTRUMENT_POLL_INTERVAL_MS = 5000;
const SONG_INSTRUMENT_PROGRESS_TICK_MS = 400;

const bandStore = useBandStore();
const musicianStore = useMusicianStore();
const toastStore = useToastStore();
const title = ref("");
const originalVideoclipUrl = ref("");
const errorMsg = ref("");
const songsErrorMsg = ref("");
const isCreateSongModalOpen = ref(false);
const activeSongInstrumentUploadModal =
	ref<ActiveSongInstrumentUploadModalState | null>(null);
const activeAssignMusicianModal = ref<AssignMusicianModalState | null>(null);
const activeEditInstrumentModal = ref<EditInstrumentModalState | null>(null);
const isLoading = ref(false);
const isLoadingSongs = ref(false);
const songs = ref<SongResponse[]>([]);
const songInstruments = ref<SongInstrumentMap>({});
const songInstrumentForms = ref<SongInstrumentFormMap>({});
const songInstrumentUploads = ref<SongInstrumentUploadMap>({});
const songInstrumentDetails = ref<SongInstrumentDetailMap>({});
const availableInstruments = ref<InstrumentResponse[]>([]);
const catalogInstrumentNames = ref<InstrumentNameMap>({});
const musicianDisplayNames = ref<MusicianDisplayNameMap>({});
const songActionTooltipTargets = ref<TooltipTarget[]>([]);

const songRepository = new AxiosSongRepository();
const bandRepository = new AxiosBandRepository();
const instrumentRepository = new AxiosInstrumentRepository();
const musicianRepository = new AxiosMusicianRepository();
const createSongUseCase = new CreateSongUseCase(songRepository);
const getBandMembersUseCase = new GetBandMembersUseCase(bandRepository);
const getBandSongsUseCase = new GetBandSongsUseCase(songRepository);
const createSongInstrumentUseCase = new CreateSongInstrumentUseCase(songRepository);
const getSongInstrumentsUseCase = new GetSongInstrumentsUseCase(songRepository);
const getSongInstrumentDetailUseCase = new GetSongInstrumentDetailUseCase(
	songRepository,
);
const getInstrumentsUseCase = new GetInstrumentsUseCase(instrumentRepository);
const getInstrumentByIdUseCase = new GetInstrumentByIdUseCase(instrumentRepository);
const getMusicianByIdUseCase = new GetMusicianByIdUseCase(musicianRepository);
const assignSongInstrumentMusicianUseCase = new AssignSongInstrumentMusicianUseCase(
	songRepository,
);
const inviteSongInstrumentMusicianUseCase = new InviteSongInstrumentMusicianUseCase(
	songRepository,
);
const updateSongInstrumentUseCase = new UpdateSongInstrumentUseCase(songRepository);
const uploadSongInstrumentVideoUseCase = new UploadSongInstrumentVideoUseCase(songRepository);

const selectedBand = computed(() => bandStore.selectedBand);
const selectedBandId = computed(() => bandStore.selectedBandId);
const canSubmit = computed(
	() => !isLoading.value && selectedBand.value !== null,
);
const activeSongInstrumentFormSong = computed(() =>
	songs.value.find((song) => songInstrumentForms.value[song.id]?.isVisible) ?? null,
);
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
const isAnyModalOpen = computed(
	() =>
		isCreateSongModalOpen.value ||
		activeSongInstrumentFormSong.value !== null ||
		activeSongInstrumentUploadModalContext.value !== null ||
		activeAssignMusicianModalContext.value !== null ||
		activeEditInstrumentModalContext.value !== null,
);

const songInstrumentPollTimeouts = new Map<
	string,
	ReturnType<typeof setTimeout>
>();
const songInstrumentProgressTimeouts = new Map<
	string,
	ReturnType<typeof setTimeout>
>();
const songInstrumentPollVersions = new Map<string, number>();
const instrumentDetailRequests = new Map<string, Promise<void>>();
const musicianDetailRequests = new Map<string, Promise<void>>();
let availableInstrumentsRequest: Promise<void> | null = null;
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
	songActionTooltips = songActionTooltipTargets.value.map((target) =>
		Tooltip.getOrCreateInstance(target) as TooltipInstance,
	);
}

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
	return typeof error === "object" && error !== null;
}

function getSongInstrumentCatalogId(
	instrument: SongInstrumentListItemResponse | SongInstrumentDetailResponse,
): string {
	return instrument.instrumentId ?? instrument.instrumentType ?? "";
}

function setCatalogInstrumentName(instrumentId: string, name: string): void {
	catalogInstrumentNames.value = {
		...catalogInstrumentNames.value,
		[instrumentId]: name,
	};
}

function getCatalogInstrumentName(instrumentId: string): string {
	return (
		catalogInstrumentNames.value[instrumentId] ??
		availableInstruments.value.find((instrument) => instrument.id === instrumentId)?.name ??
		instrumentId
	);
}

function setMusicianDisplayName(musicianId: string, displayName: string): void {
	musicianDisplayNames.value = {
		...musicianDisplayNames.value,
		[musicianId]: displayName,
	};
}

function resolveMusicianDisplayName(name: string, username: string): string {
	const trimmedName = name.trim();
	if (trimmedName.length > 0) {
		return trimmedName;
	}

	const trimmedUsername = username.trim();
	if (trimmedUsername.length > 0) {
		return `@${trimmedUsername}`;
	}

	return "";
}

function isAssignMusicianModalActive(songId: string, instrumentId: string): boolean {
	return (
		activeAssignMusicianModal.value?.songId === songId &&
		activeAssignMusicianModal.value?.instrumentId === instrumentId
	);
}

function isEditInstrumentModalActive(songId: string, instrumentId: string): boolean {
	return (
		activeEditInstrumentModal.value?.songId === songId &&
		activeEditInstrumentModal.value?.instrumentId === instrumentId
	);
}

async function resolveAssignableBandMember(
	member: BandMemberResponse,
): Promise<AssignableBandMemberViewModel | null> {
	const musician = await getMusicianByIdUseCase.run(member.musicianId);
	if (!musician) {
		return null;
	}

	const displayName = resolveMusicianDisplayName(
		musician.name,
		musician.username,
	);
	const username = musician.username.trim();
	return {
		id: musician.id,
		name: displayName || musician.id,
		username: username ? `@${username}` : "",
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
		membersErrorMsg: "",
		members: [],
	};

	try {
		const bandMembers = await getBandMembersUseCase.run(bandId);
		const resolvedMembers = await Promise.all(
			bandMembers.map(resolveAssignableBandMember),
		);
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
			membersErrorMsg: "",
		};
	} catch {
		if (
			!isAssignMusicianModalActive(songId, instrumentId) ||
			selectedBandId.value !== bandId ||
			!activeAssignMusicianModal.value
		) {
			return;
		}

		const message = "No pudimos cargar los miembros de la banda.";
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

async function ensureAvailableInstrumentsLoaded(): Promise<void> {
	if (availableInstruments.value.length > 0) {
		return;
	}

	if (availableInstrumentsRequest) {
		return availableInstrumentsRequest;
	}

	availableInstrumentsRequest = (async () => {
		try {
			const instruments = await getInstrumentsUseCase.run();
			if (!isViewMounted) {
				return;
			}

			availableInstruments.value = instruments;
		} catch {
			if (isViewMounted) {
				availableInstruments.value = [];
			}
		} finally {
			availableInstrumentsRequest = null;
		}
	})();

	return availableInstrumentsRequest;
}

async function ensureCatalogInstrumentNameLoaded(instrumentId: string): Promise<void> {
	if (!instrumentId || catalogInstrumentNames.value[instrumentId]) {
		return;
	}

	const currentRequest = instrumentDetailRequests.get(instrumentId);
	if (currentRequest) {
		return currentRequest;
	}

	const request = (async () => {
		const instrument = await getInstrumentByIdUseCase.run(instrumentId);
		if (!isViewMounted) {
			return;
		}

		setCatalogInstrumentName(instrument.id, instrument.name);
	})().finally(() => {
		instrumentDetailRequests.delete(instrumentId);
	});

	instrumentDetailRequests.set(instrumentId, request);
	return request;
}

async function preloadCatalogInstrumentNames(
	instruments: SongInstrumentListItemResponse[],
): Promise<void> {
	const uniqueInstrumentIds = [...new Set(instruments.map(getSongInstrumentCatalogId))].filter(
		(instrumentId) => instrumentId.length > 0,
	);

	await Promise.all(
		uniqueInstrumentIds.map(async (instrumentId) => {
			try {
				await ensureCatalogInstrumentNameLoaded(instrumentId);
			} catch {
				// Keep the fallback name when the catalog detail cannot be resolved.
			}
		}),
	);
}

async function ensureMusicianDisplayNameLoaded(musicianId: string): Promise<void> {
	if (!musicianId || musicianDisplayNames.value[musicianId]) {
		return;
	}

	const currentRequest = musicianDetailRequests.get(musicianId);
	if (currentRequest) {
		return currentRequest;
	}

	const request = (async () => {
		const musician = await getMusicianByIdUseCase.run(musicianId);
		if (!isViewMounted || !musician) {
			return;
		}

		const displayName = resolveMusicianDisplayName(
			musician.name,
			musician.username,
		);
		if (!displayName) {
			return;
		}

		setMusicianDisplayName(musician.id, displayName);
	})().finally(() => {
		musicianDetailRequests.delete(musicianId);
	});

	musicianDetailRequests.set(musicianId, request);
	return request;
}

async function preloadMusicianDisplayNames(
	instruments: SongInstrumentListItemResponse[],
): Promise<void> {
	const uniqueMusicianIds = [...new Set(instruments.map((instrument) => instrument.musicianId))]
		.filter((musicianId) => musicianId.length > 0);

	await Promise.all(
		uniqueMusicianIds.map(async (musicianId) => {
			try {
				await ensureMusicianDisplayNameLoaded(musicianId);
			} catch {
				// Keep the raw musician id visible when the profile lookup fails.
			}
		}),
	);
}

function getSongInstrumentForm(songId: string): SongInstrumentFormState {
	const current = songInstrumentForms.value[songId];
	if (current) {
		return current;
	}

	const nextState: SongInstrumentFormState = {
		isVisible: false,
		name: "",
		instrumentId: "",
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
					name: detail.name,
					instrumentId: detail.instrumentId,
					instrumentType: detail.instrumentType,
					musicianId: detail.musicianId,
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

function getSongInstrument(
	songId: string,
	instrumentId: string,
): SongInstrumentListItemResponse | null {
	return (
		songInstruments.value[songId]?.find(
			(instrument) => instrument.id === instrumentId,
		) ?? null
	);
}

function getSongInstrumentDisplayName(
	instrument: SongInstrumentListItemResponse,
): string {
	return getCatalogInstrumentName(getSongInstrumentCatalogId(instrument));
}

function getSongInstrumentMusicianDisplayName(
	instrument: SongInstrumentListItemResponse,
): string {
	const currentProfile = musicianStore.profile;
	if (currentProfile?.id === instrument.musicianId) {
		return (
			resolveMusicianDisplayName(currentProfile.name, currentProfile.username) ||
			instrument.musicianId ||
			"Sin asignar"
		);
	}

	return (
		musicianDisplayNames.value[instrument.musicianId] ??
		instrument.musicianId ??
		"Sin asignar"
	);
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

function clearSongInstrumentProgressTimer(
	songId: string,
	instrumentId: string,
): void {
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
	songInstrumentPollVersions.set(
		key,
		(songInstrumentPollVersions.get(key) ?? 0) + 1,
	);
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
		code.includes("econnaborted") ||
		message.includes("timeout") ||
		message.includes("exceeded")
	) {
		return "La subida tardó demasiado. Inténtalo de nuevo.";
	}

	if (
		details.name === "AbortError" ||
		combined.includes("upload aborted by client") ||
		code.includes("err_canceled") ||
		message.includes("canceled")
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

function mapAssignMusicianErrorMessage(details: UploadErrorDetails): string {
	const message = details.message?.toLowerCase() ?? "";
	const code = details.code?.toLowerCase() ?? "";
	const combined = `${code} ${message}`;

	if (details.status === 401 || details.status === 403) {
		return "No tienes permisos para asignar músicos a este instrumento.";
	}

	if (details.status === 404 || combined.includes("songinstrument_not_exists")) {
		return "No se encontró el instrumento que intentabas actualizar.";
	}

	if (details.status === 400) {
		return "No pudimos asignar el músico seleccionado.";
	}

	return "Ocurrió un error al asignar el músico. Inténtalo de nuevo.";
}

function mapInviteMusicianErrorMessage(details: UploadErrorDetails): string {
	const message = details.message?.toLowerCase() ?? "";
	const code = details.code?.toLowerCase() ?? "";
	const combined = `${code} ${message}`;

	if (details.status === 401 || details.status === 403) {
		return "No tienes permisos para invitar músicos a este instrumento.";
	}

	if (details.status === 404 || combined.includes("songinstrument_not_exists")) {
		return "No se encontró el instrumento que intentabas actualizar.";
	}

	if (combined.includes("musicianemail cannot be empty")) {
		return "Escribe un email antes de enviar la invitación.";
	}

	if (combined.includes("musicianemail must be a valid email")) {
		return "Escribe un email válido antes de continuar.";
	}

	if (details.status === 400) {
		return "No pudimos enviar la invitación al email indicado.";
	}

	return "Ocurrió un error al invitar al músico. Inténtalo de nuevo.";
}

function mapEditInstrumentErrorMessage(details: UploadErrorDetails): string {
	const message = details.message?.toLowerCase() ?? "";
	const code = details.code?.toLowerCase() ?? "";
	const combined = `${code} ${message}`;

	if (details.status === 401 || details.status === 403) {
		return "No tienes permisos para editar este instrumento.";
	}

	if (details.status === 404 || combined.includes("instrument_not_exists")) {
		return "No se encontró el instrumento de la canción que intentabas editar.";
	}

	if (combined.includes("songinstrumentname cannot be empty")) {
		return "Escribe un nombre antes de guardar.";
	}

	if (combined.includes("instrumentid cannot be empty")) {
		return "Selecciona un instrumento antes de guardar.";
	}

	if (details.status === 400) {
		return "No pudimos actualizar el instrumento de la canción.";
	}

	return "Ocurrió un error al actualizar el instrumento. Inténtalo de nuevo.";
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
		return "";
	}

	const upload = getEffectiveUpload(songId, instrument);
	if (
		uploadState.isSubmitting &&
		uploadState.progressStage === songInstrumentUploadProgressStages.REQUEST
	) {
		return "Subiendo video al servidor...";
	}

	if (upload?.status === songInstrumentUploadStatuses.PENDING) {
		return "Subida aceptada. Pendiente de validación.";
	}

	if (upload?.status === songInstrumentUploadStatuses.READY) {
		return "Video recibido. Validando archivo...";
	}

	if (upload?.status === songInstrumentUploadStatuses.PROCESSING) {
		return "Procesando y sincronizando video...";
	}

	if (upload?.status === songInstrumentUploadStatuses.COMPLETED) {
		return "Finalizando disponibilidad del video...";
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

function scheduleSongInstrumentProgressTick(
	songId: string,
	instrumentId: string,
): void {
	clearSongInstrumentProgressTimer(songId, instrumentId);
	const key = getSongInstrumentUploadKey(songId, instrumentId);
	const timeoutId = setTimeout(() => {
		if (!isViewMounted || !isSongStillVisible(songId)) {
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

function startSongInstrumentRequestProgress(
	songId: string,
	instrumentId: string,
): void {
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

function shouldShowSongInstrumentProgress(
	songId: string,
	instrumentId: string,
): boolean {
	if (getEffectiveVideo(songId, instrumentId)) {
		return false;
	}

	const progressStage = getSongInstrumentUploadState(
		songId,
		instrumentId,
	).progressStage;
	return (
		progressStage === songInstrumentUploadProgressStages.REQUEST ||
		progressStage === songInstrumentUploadProgressStages.BACKEND
	);
}

function hasSongInstrumentVideo(songId: string, instrumentId: string): boolean {
	return getEffectiveVideo(songId, instrumentId) !== null;
}

function getSongInstrumentAvailabilityLabel(
	songId: string,
	instrumentId: string,
): string {
	return hasSongInstrumentVideo(songId, instrumentId) ? "Disponible" : "Pendiente";
}

function getSongInstrumentAvailabilityBadgeClass(
	songId: string,
	instrumentId: string,
): string {
	return hasSongInstrumentVideo(songId, instrumentId)
		? "text-bg-success"
		: "text-bg-warning";
}

function shouldShowSongInstrumentUploadForm(
	songId: string,
	instrumentId: string,
): boolean {
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

	if (hasSongInstrumentVideo(songId, instrument.id)) {
		return "Resubir video";
	}

	return "Subir video";
}

async function refreshSongInstrumentDetail(
	songId: string,
	instrumentId: string,
): Promise<SongInstrumentDetailResponse> {
	const detail = await getSongInstrumentDetailUseCase.run(songId, instrumentId);
	const catalogInstrumentId = getSongInstrumentCatalogId(detail);
	if (isViewMounted && isSongStillVisible(songId)) {
		setSongInstrumentDetail(detail);
	}
	if (catalogInstrumentId) {
		try {
			await ensureCatalogInstrumentNameLoaded(catalogInstrumentId);
		} catch {
			// Catalog name resolution must not break the song instrument flow.
		}
	}
	if (detail.musicianId) {
		try {
			await ensureMusicianDisplayNameLoaded(detail.musicianId);
		} catch {
			// Keep the raw musician id visible when the profile lookup fails.
		}
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
				"La subida del vídeo falló.",
			);
			setSongInstrumentUploadState(songId, instrumentId, {
				isSubmitting: false,
				successMsg: "",
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
			successMsg: "",
			errorMsg: detail.video ? "" : undefined,
		});
	} catch (error: unknown) {
		const message = mapUploadErrorMessage(
			extractUploadErrorDetails(error),
			"No pudimos actualizar el estado del video.",
		);
		cancelSongInstrumentPoll(songId, instrumentId);
		resetSongInstrumentProgress(songId, instrumentId);
		setSongInstrumentUploadState(songId, instrumentId, {
			isSubmitting: false,
			successMsg: "",
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
			successMsg: "",
			errorMsg: "",
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
				successMsg: "",
				errorMsg: "",
			});
			startSongInstrumentBackendProgress(songId, instrument.id, detail.upload);
			scheduleSongInstrumentPoll(songId, instrument.id, 1);
			return;
		}
	}

	resetSongInstrumentProgress(songId, instrument.id);
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
			error instanceof Error
				? error.message
				: "Ocurrió un error inesperado al cargar las canciones.";
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
	isCreateSongModalOpen.value = true;
}

function closeCreateSongModal(): void {
	isCreateSongModalOpen.value = false;
	resetCreateSongForm();
}

async function handleCreateSong() {
	errorMsg.value = "";

	if (!selectedBand.value) {
		errorMsg.value = "Selecciona una banda antes de crear una canción.";
		showErrorToast(errorMsg.value);
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
		showSuccessToast("Canción creada correctamente.");
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
		showErrorToast(errorMsg.value);
	} finally {
		isLoading.value = false;
	}
}

function openSongInstrumentForm(songId: string): void {
	void ensureAvailableInstrumentsLoaded();
	songInstrumentForms.value = Object.fromEntries(
		Object.entries(songInstrumentForms.value).map(([currentSongId, formState]) => [
			currentSongId,
			{
				...formState,
				isVisible: currentSongId === songId,
				errorMsg: currentSongId === songId ? "" : formState.errorMsg,
			},
		]),
	) as SongInstrumentFormMap;

	if (!songInstrumentForms.value[songId]) {
		setSongInstrumentForm(songId, {
			isVisible: true,
			errorMsg: "",
		});
	}
}

function closeSongInstrumentForm(songId: string): void {
	setSongInstrumentForm(songId, {
		isVisible: false,
		errorMsg: "",
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

function openAssignMusicianModal(songId: string, instrumentId: string): void {
	activeAssignMusicianModal.value = {
		songId,
		instrumentId,
		email: "",
		isSubmitting: false,
		errorMsg: "",
		members: [],
		isLoadingMembers: false,
		membersErrorMsg: "",
	};
	void loadAssignableBandMembers(songId, instrumentId, selectedBandId.value);
}

function closeAssignMusicianModal(): void {
	activeAssignMusicianModal.value = null;
}

function setActiveEditInstrumentModal(
	updates: Partial<EditInstrumentModalState>,
): void {
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
			errorMsg: "",
		});
	} catch {
		if (!isEditInstrumentModalActive(songId, instrumentId)) {
			return;
		}

		const message = "No pudimos cargar el detalle del instrumento seleccionado.";
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
		errorMsg: "",
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
		target && typeof target === "object" && "value" in target
			? ((target as TextInputLike).value ?? "")
			: "";
	setActiveEditInstrumentModal({
		name: nextValue,
		errorMsg: "",
	});
}

function handleEditInstrumentCatalogInput(event: Event): void {
	const target = event.target;
	const nextValue =
		target && typeof target === "object" && "value" in target
			? ((target as TextInputLike).value ?? "")
			: "";
	setActiveEditInstrumentModal({
		catalogInstrumentId: nextValue,
		errorMsg: "",
	});
}

function handleAssignMusicianEmailInput(event: Event): void {
	const target = event.target;
	const nextEmail =
		target && typeof target === "object" && "value" in target
			? ((target as TextInputLike).value ?? "")
			: "";
	if (!activeAssignMusicianModal.value) {
		return;
	}

	activeAssignMusicianModal.value = {
		...activeAssignMusicianModal.value,
		email: nextEmail,
		errorMsg: "",
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
		errorMsg: "",
	};

	try {
		await assignSongInstrumentMusicianUseCase.run(
			modalState.songId,
			modalState.instrumentId,
			musicianId,
		);
		await refreshSongInstrumentDetail(modalState.songId, modalState.instrumentId);
		if (isAssignMusicianModalActive(modalState.songId, modalState.instrumentId)) {
			showSuccessToast("Músico asignado correctamente.");
			closeAssignMusicianModal();
		}
	} catch (error: unknown) {
		if (!isAssignMusicianModalActive(modalState.songId, modalState.instrumentId)) {
			return;
		}

		const message = mapAssignMusicianErrorMessage(
			extractUploadErrorDetails(error),
		);
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
		errorMsg: "",
	};

	try {
		await inviteSongInstrumentMusicianUseCase.run(
			modalState.songId,
			modalState.instrumentId,
			modalState.email,
		);
		await refreshSongInstrumentDetail(modalState.songId, modalState.instrumentId);
		if (isAssignMusicianModalActive(modalState.songId, modalState.instrumentId)) {
			showSuccessToast("Invitación enviada correctamente.");
			closeAssignMusicianModal();
		}
	} catch (error: unknown) {
		if (!isAssignMusicianModalActive(modalState.songId, modalState.instrumentId)) {
			return;
		}

		const message = mapInviteMusicianErrorMessage(
			extractUploadErrorDetails(error),
		);
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

async function handleEditInstrumentSubmit(): Promise<void> {
	if (!activeEditInstrumentModal.value) {
		return;
	}

	const modalState = activeEditInstrumentModal.value;
	const trimmedName = modalState.name.trim();

	if (!modalState.songId || !modalState.instrumentId) {
		const message = "No encontramos el instrumento de la canción que intentabas editar.";
		setActiveEditInstrumentModal({
			errorMsg: message,
		});
		showErrorToast(message);
		return;
	}

	if (!modalState.catalogInstrumentId) {
		const message = "Selecciona un instrumento antes de guardar.";
		setActiveEditInstrumentModal({
			errorMsg: message,
		});
		showErrorToast(message);
		return;
	}

	if (!trimmedName) {
		const message = "Escribe un nombre antes de guardar.";
		setActiveEditInstrumentModal({
			errorMsg: message,
		});
		showErrorToast(message);
		return;
	}

	setActiveEditInstrumentModal({
		isSubmitting: true,
		errorMsg: "",
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
		showSuccessToast("Instrumento actualizado correctamente.");
		closeEditInstrumentModal();
	} catch (error: unknown) {
		if (!isEditInstrumentModalActive(modalState.songId, modalState.instrumentId)) {
			return;
		}

		const message = mapEditInstrumentErrorMessage(
			extractUploadErrorDetails(error),
		);
		setActiveEditInstrumentModal({
			isSubmitting: false,
			errorMsg: message,
		});
		showErrorToast(message);
	}
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
		const message = "Seleccioná un vídeo antes de continuar.";
		resetSongInstrumentProgress(songId, instrumentId);
		setSongInstrumentUploadState(songId, instrumentId, {
			selectedFile: null,
			successMsg: "",
			errorMsg: message,
		});
		showErrorToast(message);
		return;
	}

	if (selectedFile.type !== "video/mp4") {
		const message = "El vídeo tiene que estar en formato MP4.";
		resetSongInstrumentProgress(songId, instrumentId);
		setSongInstrumentUploadState(songId, instrumentId, {
			selectedFile: null,
			successMsg: "",
			errorMsg: message,
		});
		showErrorToast(message);
		return;
	}

	resetSongInstrumentProgress(songId, instrumentId);
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
		const message = uploadState.errorMsg || "Seleccioná un vídeo antes de continuar.";
		setSongInstrumentUploadState(songId, instrumentId, {
			errorMsg: message,
			successMsg: "",
		});
		showErrorToast(message);
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
	startSongInstrumentRequestProgress(songId, instrumentId);

	try {
		await uploadSongInstrumentVideoUseCase.run(
			songId,
			instrumentId,
			uploadState.selectedFile,
		);
		setSongInstrumentUploadState(songId, instrumentId, {
			selectedFile: null,
			isSubmitting: false,
			successMsg: "",
		});
		startSongInstrumentBackendProgress(songId, instrumentId, {
			status: songInstrumentUploadStatuses.PENDING,
		});
		scheduleSongInstrumentPoll(songId, instrumentId, 1);
	} catch (error: unknown) {
		const message = mapUploadErrorMessage(
			extractUploadErrorDetails(error),
			"No se pudo iniciar la subida del vídeo.",
		);
		resetSongInstrumentProgress(songId, instrumentId);
		setSongInstrumentUploadState(songId, instrumentId, {
			errorMsg: message,
			isSubmitting: false,
			successMsg: "",
		});
		showErrorToast(message);
		setSongInstrumentUploadStatus(songId, instrumentId, null);
	}
}

async function handleCreateSongInstrument(songId: string): Promise<void> {
	const musicianProfileId = musicianStore.profile?.id;
	if (!musicianProfileId) {
		const message = "Debes completar tu perfil de músico para añadir instrumentos.";
		setSongInstrumentForm(songId, {
			errorMsg: message,
		});
		showErrorToast(message);
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
			name: "",
			instrumentId: "",
			isSubmitting: false,
		});
		showSuccessToast("Instrumento agregado correctamente.");
	} catch (error: unknown) {
		if (isHttpErrorLike(error) && error.response?.status === 409) {
			const message =
				"Ya existe un instrumento con esos datos para esta canción. Inténtalo de nuevo.";
			setSongInstrumentForm(songId, {
				errorMsg: message,
				isSubmitting: false,
			});
			showErrorToast(message);
			return;
		}

		if (isHttpErrorLike(error) && error.response?.status === 403) {
			const message = "No tienes permisos para añadir instrumentos a esta canción.";
			setSongInstrumentForm(songId, {
				errorMsg: message,
				isSubmitting: false,
			});
			showErrorToast(message);
			return;
		}

		const message =
			error instanceof Error
				? error.message
				: "Ocurrió un error inesperado al añadir el instrumento.";
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

        <p v-else-if="songsErrorMsg" class="text-muted mb-0">
          No pudimos cargar las canciones por ahora.
        </p>

        <p v-else-if="songs.length === 0" class="text-muted mb-0">
          Esta banda todavía no tiene canciones.
        </p>

        <div v-else data-testid="songs-list" class="d-grid gap-3">
          <article
            v-for="song in songs"
            :key="song.id"
            class="border rounded-3 p-3 bg-body-tertiary"
          >
            <div class="d-flex flex-column gap-3">
              <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2">
                <div>
                  <h3 class="h5 mb-1">{{ song.title }}</h3>
                  <p class="text-muted small mb-0">Videoclip original</p>
                </div>
                <a
                  :href="song.originalVideoclipUrl"
                  target="_blank"
                  rel="noreferrer noopener"
                  class="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-2"
                >
                  <span aria-hidden="true">▶</span>
                  <span>Ver en YouTube</span>
                </a>
              </div>

              <section class="border-top pt-3">
                <div
                  :data-testid="`song-instruments-header-${song.id}`"
                  class="d-flex justify-content-between align-items-center gap-2 mb-3"
                >
                  <h4 class="h6 mb-0">Instrumentos</h4>
                  <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm py-1 px-2 small"
                    @click="openSongInstrumentForm(song.id)"
                  >
                    Añadir instrumento
                  </button>
                </div>
                <p v-if="(songInstruments[song.id] ?? []).length === 0" class="text-muted mb-0 small">
                  Esta canción todavía no tiene instrumentos.
                </p>
                <div v-else class="table-responsive">
                  <table class="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Título de la pista</th>
                        <th scope="col">Instrumento</th>
                        <th scope="col">Músico</th>
                        <th scope="col">Estado</th>
                        <th scope="col">Acciones</th>
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
                                  :data-testid="hasSongInstrumentVideo(song.id, instrument.id)
                                    ? `upload-complete-${song.id}-${instrument.id}`
                                    : `upload-status-${song.id}-${instrument.id}`"
                                  class="badge rounded-pill"
                                  :class="getSongInstrumentAvailabilityBadgeClass(song.id, instrument.id)"
                                >
                                  {{ getSongInstrumentAvailabilityLabel(song.id, instrument.id) }}
                                </span>
                                <a
                                  v-if="hasSongInstrumentVideo(song.id, instrument.id)"
                                  ref="songActionTooltipTargets"
                                  :href="getEffectiveVideo(song.id, instrument.id)?.url"
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  class="d-inline-flex align-items-center justify-content-center text-body-emphasis text-decoration-none"
                                  data-bs-toggle="tooltip"
                                  data-bs-title="Ver video"
                                  aria-label="Ver video"
                                >
                                  <i class="bi bi-eye" aria-hidden="true"></i>
                                </a>
                              </div>
                            </td>
                        <td>
                          <div class="song-instrument-actions d-flex flex-wrap align-items-center gap-2">
                            <span
                              ref="songActionTooltipTargets"
                              class="song-instrument-action-wrapper d-inline-flex"
                              tabindex="0"
                              data-bs-toggle="tooltip"
                              data-bs-title="Editar"
                              aria-label="Editar"
                            >
                              <button
                                type="button"
                                class="song-instrument-action btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center px-2 rounded-2"
                                aria-label="Editar"
                                :disabled="!song.id || !instrument.id"
                                @click="openEditInstrumentModal(song.id, instrument.id)"
                              >
                                <i class="bi bi-pencil" aria-hidden="true"></i>
                              </button>
                            </span>
                            <button
                              ref="songActionTooltipTargets"
                              type="button"
                              class="song-instrument-action btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-center px-2 rounded-2"
                              data-bs-toggle="tooltip"
                              data-bs-title="Subir vídeo"
                              aria-label="Subir vídeo"
                              @click="openSongInstrumentUploadModal(song.id, instrument.id)"
                            >
                              <i class="bi bi-upload" aria-hidden="true"></i>
                            </button>
                            <button
                              ref="songActionTooltipTargets"
                              type="button"
                              class="song-instrument-action btn btn-sm btn-outline-dark d-inline-flex align-items-center justify-content-center px-2 rounded-2"
                              data-bs-toggle="tooltip"
                              data-bs-title="Asignar músico"
                              aria-label="Asignar músico"
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
              Añadir instrumento a {{ activeSongInstrumentFormSong.title }}
            </h4>
            <button
              type="button"
              class="btn-close"
              aria-label="Cerrar"
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
                  <label :for="`songInstrumentName-${activeSongInstrumentFormSong.id}`" class="form-label mb-1">Título de la pista</label>
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
                  <label :for="`songInstrumentId-${activeSongInstrumentFormSong.id}`" class="form-label mb-1">Instrumento</label>
                  <select
                    :id="`songInstrumentId-${activeSongInstrumentFormSong.id}`"
                    v-model="songInstrumentForms[activeSongInstrumentFormSong.id].instrumentId"
                    class="form-select form-select-sm"
                    :disabled="songInstrumentForms[activeSongInstrumentFormSong.id].isSubmitting"
                    required
                  >
                    <option value="" disabled>
                      Selecciona un instrumento
                    </option>
                    <option
                      v-for="instrument in availableInstruments"
                      :key="instrument.id"
                      :value="instrument.id"
                    >
                      {{ instrument.name }}
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
                Cancelar
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
                {{ songInstrumentForms[activeSongInstrumentFormSong.id].isSubmitting ? 'Añadiendo...' : 'Guardar instrumento' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="activeEditInstrumentModalContext && activeEditInstrumentModal"
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
              Editar instrumento · {{ activeEditInstrumentModal.name || getSongInstrumentDisplayName(activeEditInstrumentModalContext.instrument) }}
            </h4>
            <button
              type="button"
              class="btn-close"
              aria-label="Cerrar"
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
                Cargando detalle del instrumento...
              </div>

              <div v-else class="row g-3">
                <div class="col-12">
                  <label :for="`editInstrumentName-${activeEditInstrumentModal.instrumentId}`" class="form-label">Título de la pista</label>
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
<label :for="`editInstrumentCatalogId-${activeEditInstrumentModal.instrumentId}`" class="form-label">Instrumento</label>
                      <select
                        :id="`editInstrumentCatalogId-${activeEditInstrumentModal.instrumentId}`"
                        :value="activeEditInstrumentModal.catalogInstrumentId"
                        class="form-select"
                        :disabled="activeEditInstrumentModal.isSubmitting"
                        required
                        @change="handleEditInstrumentCatalogInput"
                      >
                        <option value="" disabled>
                          Selecciona un instrumento
                        </option>
                        <option
                          v-for="instrument in availableInstruments"
                          :key="instrument.id"
                          :value="instrument.id"
                        >
                          {{ instrument.name }}
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
                Cancelar
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
                {{ activeEditInstrumentModal.isSubmitting ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="activeSongInstrumentUploadModalContext"
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
              Subir vídeo · {{ activeSongInstrumentUploadModalContext.instrument.name }}
            </h4>
            <button
              type="button"
              class="btn-close"
              aria-label="Cerrar"
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
                <label :for="`songInstrumentVideo-${activeSongInstrumentUploadModalContext.song.id}-${activeSongInstrumentUploadModalContext.instrument.id}`" class="form-label">Video MP4</label>
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
                  aria-label="Upload progress"
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
                Cerrar
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
              Asignar músico · {{ activeAssignMusicianModalContext.instrument.name }}
            </h4>
            <button
              type="button"
              class="btn-close"
              aria-label="Cerrar"
              :disabled="activeAssignMusicianModal.isSubmitting"
              @click="closeAssignMusicianModal"
            ></button>
          </div>
          <form aria-label="Invitar músico por email" @submit.prevent="handleAssignMusicianSubmit">
            <div class="modal-body">
              <label :for="`assignMusicianEmail-${activeAssignMusicianModalContext.instrument.id}`" class="form-label">Email del músico</label>
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
                Si la persona todavía no forma parte de la banda, puedes invitarla por email.
              </p>

              <div class="border-top mt-4 pt-3">
                <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <h5 class="h6 mb-1">Miembros de la banda</h5>
                    <p class="text-muted small mb-0">Selecciona a alguien del equipo actual para asignarlo al instrumento.</p>
                  </div>
                  <span class="badge text-bg-light border">{{ activeAssignMusicianModal.members.length }}</span>
                </div>

                <p v-if="activeAssignMusicianModal.isLoadingMembers" class="text-muted small mb-0">
                  Cargando miembros...
                </p>
                <p v-else-if="activeAssignMusicianModal.membersErrorMsg" class="text-muted small mb-0">
                  {{ activeAssignMusicianModal.membersErrorMsg }}
                </p>
                <p v-else-if="activeAssignMusicianModal.members.length === 0" class="text-muted small mb-0">
                  No hay miembros disponibles para seleccionar.
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
                      :aria-label="`Seleccionar a ${member.name}`"
                      :disabled="activeAssignMusicianModal.isSubmitting"
                      @click="handleAssignBandMemberSelection(member)"
                    >
                      Seleccionar
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" :disabled="activeAssignMusicianModal.isSubmitting" @click="closeAssignMusicianModal">
                Cancelar
              </button>
                  <button
                    type="submit"
                    class="btn btn-primary"
                    :disabled="activeAssignMusicianModal.isSubmitting"
                  >
                    Invitar por email
                  </button>

            </div>
          </form>
        </div>
      </div>
    </div>

    <div v-if="isAnyModalOpen" class="modal-backdrop show"></div>

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

<style scoped>
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

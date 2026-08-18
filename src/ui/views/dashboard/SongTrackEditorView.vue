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
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { SongInstrumentDetailResponse } from "../../../domain/song/SongInstrumentResponse.js";
import { container } from "../../bootstrap/container.js";
import { useToastStore } from "../../stores/useToastStore.js";
import { getYoutubeVideoId } from "../../utils/youtube.js";
import { useYoutubeIframePlayer } from "../../composables/useYoutubeIframePlayer.js";
import { useTrackWaveformAssets } from "../../composables/useTrackWaveformAssets.js";
import { resamplePeaksToWidth } from "../../utils/audioPeaks.js";
import { useModalFocusTrap } from "../../composables/useModalFocusTrap.js";

interface EditorTrack {
	id: string;
	name: string;
	instrumentId: string | null;
	startTimeMs: number;
	isMuted: boolean;
	isSoloed: boolean;
	volume: number;
	isOriginalAudio?: boolean;
	video: NonNullable<SongInstrumentDetailResponse["video"]>;
}

interface PlayerLike {
	currentTime?: number;
	muted?: boolean;
	volume?: number;
	play?: () => Promise<void> | void;
	pause?: () => void;
}

interface TrackDragEventLike {
	clientX?: number;
	pointerId?: number;
	currentTarget?: EventTarget | null;
	preventDefault?: () => void;
}

interface TimelineSeekEventLike {
	clientX?: number;
	offsetX?: number;
	currentTarget?: EventTarget | null;
}

function hasPointerCapture(
	target: EventTarget | null | undefined,
): target is Element {
	return !!target && "setPointerCapture" in target;
}

function hasBoundingClientRect(
	target: EventTarget | null | undefined,
): target is Element {
	return (
		!!target &&
		typeof (target as { getBoundingClientRect?: unknown }).getBoundingClientRect ===
			"function"
	);
}

function isElementRef(value: unknown): value is Element {
	return (
		!!value &&
		typeof (value as { getBoundingClientRect?: unknown }).getBoundingClientRect ===
			"function"
	);
}

interface TrackDragState {
	trackId: string;
	startClientX: number;
	initialStartTimeMs: number;
	pointerId: number | null;
}

interface TimelineMarker {
	second: number;
	leftPx: number;
}

interface PlayerSyncState {
	playerTimeSec: number;
	syncedAtMs: number;
	isPlaying: boolean;
}

interface TooltipInstance {
	dispose: () => void;
}

const AUTOSAVE_STATES = {
	idle: "idle",
	pending: "pending",
	saving: "saving",
	saved: "saved",
	error: "error",
} as const;

type AutosaveState = typeof AUTOSAVE_STATES[keyof typeof AUTOSAVE_STATES];

interface AutosaveStatus {
	state: AutosaveState;
	message?: string;
	fadingOut?: boolean;
}

const AUTOSAVE_DEBOUNCE_MS = 2500;
const AUTOSAVE_SAVED_VISIBLE_MS = 1500;
const AUTOSAVE_SAVED_FADE_MS = 3000;
const PLAYBACK_TICK_MS = 200;
const PLAYER_SYNC_DRIFT_THRESHOLD_SEC = 0.25;
const MIN_TIMELINE_WINDOW_MS = 30000;
const BASE_TIMELINE_WIDTH_PX = 720;
const MIN_TIMELINE_ZOOM_PERCENT = 100;
const MAX_TIMELINE_ZOOM_PERCENT = 400;
const TIMELINE_ZOOM_STEP_PERCENT = 25;
const TRACK_VOLUME_STEP = 0.1;
const START_TIME_STEP_MS = 1000;
const START_TIME_STEP_MS_CTRL = 100;
const START_TIME_STEP_MS_CTRL_ALT = 10;
const MIN_TIMELINE_MARKER_SPACING_PX = 72;
const TIMELINE_MARKER_STEP_OPTIONS_SEC = [5, 10, 15, 30, 60, 120, 300, 600];
const TIMELINE_ZOOM_STORAGE_KEY = "song-track-editor-zoom";
const ORIGINAL_AUDIO_TRACK_ID = "__original-audio__";
const WAVEFORM_CANVAS_HEIGHT_PX = 60;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toastStore = useToastStore();
const {
	getSongInstrumentsUseCase,
	getSongInstrumentDetailUseCase,
	updateSongInstrumentVideoStartTimeUseCase,
} = container.useCases;

const isLoading = ref(true);
const errorMessage = ref("");
const tracks = ref<EditorTrack[]>([]);
const selectedTrackId = ref<string | null>(null);
const currentTimeSec = ref(0);
const isPlaying = ref(false);
const autosaveStatuses = ref<Record<string, AutosaveStatus>>({});
const timelineZoomPercent = ref(MIN_TIMELINE_ZOOM_PERCENT);
const dragState = ref<TrackDragState | null>(null);
const isZoomPopoverOpen = ref(false);
const timelineScrollWrapperRef = ref<HTMLElement | null>(null);
const isHelpModalOpen = ref(false);
const helpModalRef = ref<HTMLElement | null>(null);

const autosaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const trackControlTooltipTargets = new Map<string, Element>();
const autosaveFadeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const autosaveClearTimers = new Map<string, ReturnType<typeof setTimeout>>();
const syncPlayerRefs = new Map<string, PlayerLike>();
const playerSyncStates = new Map<string, PlayerSyncState>();
const selectedPreviewRef = ref<PlayerLike | null>(null);
let selectedPreviewSyncState: PlayerSyncState | null = null;
let playbackTimer: ReturnType<typeof setInterval> | null = null;
let lastPlaybackTickMs = 0;
let trackControlTooltips: TooltipInstance[] = [];
let isViewMounted = true;
let originalAudioPlayerRequestId = 0;
let originalAudioPlayerHostElement: HTMLElement | null = null;

const { createYoutubePlayer, destroyYoutubePlayer } = useYoutubeIframePlayer();
const originalAudioPlayerHostRef = ref<HTMLElement | null>(null);
const {
	states: trackWaveformStates,
	getRawState: getTrackWaveformState,
	ensureLoaded: ensureTrackWaveformLoaded,
} = useTrackWaveformAssets();
const trackWaveformCanvasRefs = new Map<string, HTMLCanvasElement>();
const trackAudioElementRefs = new Map<string, { src: string }>();

interface ButtonElementLike {
	disabled: boolean;
	title: string;
	classList: { toggle(className: string, force?: boolean): void };
}

const transportButtonRefs = new Map<string, ButtonElementLike>();

interface ClassListElementLike {
	classList: { toggle(className: string, force?: boolean): void };
}

let isPreparingTracksNow = true;
let preparingTracksOverlayElement: ClassListElementLike | null = null;

const songId = computed(() => String(route.params.songId ?? ""));
const songTitle = computed(() => {
	const title = route.query.title;
	return typeof title === "string" && title.length > 0
		? title
		: t('dashboard.trackEditor.defaultTitle');
});
const originalVideoClipDurationMs = computed(() => {
	const rawDurationSeconds = route.query.originalVideoClipDurationSeconds;
	const durationSeconds =
		typeof rawDurationSeconds === "string"
			? Number.parseFloat(rawDurationSeconds)
			: Array.isArray(rawDurationSeconds) && typeof rawDurationSeconds[0] === "string"
				? Number.parseFloat(rawDurationSeconds[0])
				: Number.NaN;

	if (!Number.isFinite(durationSeconds)) {
		return null;
	}

	return Math.max(0, durationSeconds * 1000);
});
const originalVideoclipUrl = computed(() => {
	const rawUrl = route.query.originalVideoclipUrl;
	return typeof rawUrl === "string" ? rawUrl : "";
});
const originalAudioYoutubeVideoId = computed(() =>
	getYoutubeVideoId(originalVideoclipUrl.value),
);
const selectedTrack = computed(
	() => tracks.value.find((track) => track.id === selectedTrackId.value) ?? null,
);
const originalAudioTrack = computed(
	() => tracks.value.find((track) => track.isOriginalAudio === true) ?? null,
);
const hasOriginalAudioTrack = computed(() => originalAudioTrack.value !== null);

// Not a computed on purpose: reading it from the template would make waveform state
// changes force a full component re-render (see applyTransportButtonsLoadingState below).
function isAnyTrackAudioLoadingNow(): boolean {
	return tracks.value.some(
		(track) =>
			!track.isOriginalAudio &&
			getTrackWaveformState(track.video.url).status === "loading",
	);
}
const timelineDurationSec = computed(() => {
	return tracks.value.reduce((maxDuration, track) => {
		const trackEndSec = track.startTimeMs / 1000 + track.video.duration;
		return Math.max(maxDuration, trackEndSec);
	}, 0);
});
const timelineWindowMs = computed(() => {
	return Math.max(
		MIN_TIMELINE_WINDOW_MS,
		Math.ceil(timelineDurationSec.value * 1000),
		...tracks.value.map((track) => track.startTimeMs + track.video.duration * 1000),
	);
});
const timelineContentWidthPx = computed(
	() => (BASE_TIMELINE_WIDTH_PX * timelineZoomPercent.value) / 100,
);
const timelinePixelsPerMs = computed(() => {
	if (timelineWindowMs.value === 0) {
		return 0;
	}

	return timelineContentWidthPx.value / timelineWindowMs.value;
});
const selectedTrackStartSec = computed(
	() => (selectedTrack.value?.startTimeMs ?? 0) / 1000,
);
const trackCountLabel = computed(() => {
	return t('dashboard.trackEditor.trackCount', tracks.value.length);
});
const originalVideoClipDurationLabel = computed(() => {
	if (originalVideoClipDurationMs.value === null) {
		return null;
	}

	return t('dashboard.trackEditor.originalVideoBadge', { time: formatTime(originalVideoClipDurationMs.value / 1000) });
});
interface HelpShortcut {
	keys: string[];
	description: string;
}
const helpShortcuts = computed<HelpShortcut[]>(() => [
	{ keys: ['Espacio'], description: t('dashboard.trackEditor.helpShortcutPlayPause') },
	{ keys: ['Shift', 'Espacio'], description: t('dashboard.trackEditor.helpShortcutStop') },
	{ keys: ['Home'], description: t('dashboard.trackEditor.helpShortcutGoToStart') },
	{ keys: ['Shift', '→'], description: t('dashboard.trackEditor.helpShortcutForward') },
	{ keys: ['Shift', '←'], description: t('dashboard.trackEditor.helpShortcutRewind') },
	{ keys: ['→'], description: t('dashboard.trackEditor.helpShortcutStartForward1000') },
	{ keys: ['Ctrl/⌘', '→'], description: t('dashboard.trackEditor.helpShortcutStartForward100') },
	{ keys: ['Ctrl/⌘', 'Alt', '→'], description: t('dashboard.trackEditor.helpShortcutStartForward10') },
	{ keys: ['←'], description: t('dashboard.trackEditor.helpShortcutStartBackward1000') },
	{ keys: ['Ctrl/⌘', '←'], description: t('dashboard.trackEditor.helpShortcutStartBackward100') },
	{ keys: ['Ctrl/⌘', 'Alt', '←'], description: t('dashboard.trackEditor.helpShortcutStartBackward10') },
	{ keys: ['↑'], description: t('dashboard.trackEditor.helpShortcutVolumeUp') },
	{ keys: ['Ctrl/⌘', '↑'], description: t('dashboard.trackEditor.helpShortcutZoomIn') },
	{ keys: ['↓'], description: t('dashboard.trackEditor.helpShortcutVolumeDown') },
	{ keys: ['Ctrl/⌘', '↓'], description: t('dashboard.trackEditor.helpShortcutZoomOut') },
	{ keys: ['Ctrl/⌘', 'M'], description: t('dashboard.trackEditor.helpShortcutMute') },
	{ keys: ['Ctrl/⌘', 'S'], description: t('dashboard.trackEditor.helpShortcutSolo') },
]);

function clampTimelineOffsetPx(offsetPx: number): number {
	return Math.max(0, Math.min(timelineContentWidthPx.value, offsetPx));
}

function convertTimelineMsToPx(valueMs: number): number {
	return valueMs * timelinePixelsPerMs.value;
}

const globalPlayheadOffsetPx = computed(() => {
	return clampTimelineOffsetPx(convertTimelineMsToPx(currentTimeSec.value * 1000));
});

function getPlayheadLineStyle(): Record<string, string> {
	return {
		left: `${globalPlayheadOffsetPx.value}px`,
		transform: "translateX(-50%)",
		pointerEvents: "none",
		height: "100%",
		width: "3px",
		borderRadius: "999px",
		background:
			"linear-gradient(180deg, rgba(255,255,255,0.95) 0%, var(--rock-accent-tertiary) 20%, var(--rock-accent-tertiary) 100%)",
		boxShadow:
			"0 0 0 1px rgba(255,255,255,0.35), 0 0 10px rgba(var(--rock-accent-tertiary-rgb), 0.35)",
		opacity: "0.95",
	};
}

function getTimelineMarkerStyle(
	marker: TimelineMarker,
	index: number,
	totalMarkers: number,
): Record<string, string> {
	if (index === 0) {
		return {
			left: `${marker.leftPx}px`,
			transform: "translateX(0%)",
		};
	}

	if (index === totalMarkers - 1) {
		return {
			left: `${marker.leftPx}px`,
			transform: "translateX(-100%)",
		};
	}

	return {
		left: `${marker.leftPx}px`,
		transform: "translateX(-50%)",
	};
}

function resolveTimelineMarkerStepSec(): number {
	const timelineDurationSec = timelineWindowMs.value / 1000;
	if (timelineDurationSec <= 0 || timelineContentWidthPx.value <= 0) {
		return TIMELINE_MARKER_STEP_OPTIONS_SEC[0];
	}

	const minimumReadableStepSec =
		(MIN_TIMELINE_MARKER_SPACING_PX * timelineDurationSec) /
		timelineContentWidthPx.value;

	return (
		TIMELINE_MARKER_STEP_OPTIONS_SEC.find(
			(stepSec) => stepSec >= minimumReadableStepSec,
		) ?? TIMELINE_MARKER_STEP_OPTIONS_SEC.at(-1) ?? 5
	);
}

const timelineMarkers = computed<TimelineMarker[]>(() => {
	const markers: TimelineMarker[] = [];
	const totalSeconds = Math.ceil(timelineWindowMs.value / 1000);
	const markerStepSec = resolveTimelineMarkerStepSec();
	for (let second = 0; second <= totalSeconds; second += markerStepSec) {
		markers.push({
			second,
			leftPx: convertTimelineMsToPx(second * 1000),
		});
	}

	if (markers.at(-1)?.second !== totalSeconds) {
		markers.push({
			second: totalSeconds,
			leftPx: convertTimelineMsToPx(totalSeconds * 1000),
		});
	}

	return markers;
});

function clampTrackStartTimeMs(startTimeMs: number): number {
	if (originalVideoClipDurationMs.value === null) {
		return startTimeMs;
	}

	return Math.min(startTimeMs, originalVideoClipDurationMs.value);
}

function extractStartTimeMs(detail: SongInstrumentDetailResponse): number {
	const rawStartTimeMs =
		typeof detail.video?.startTimeMs === "number" &&
		Number.isFinite(detail.video.startTimeMs)
			? detail.video.startTimeMs
			: typeof detail.startTimeMs === "number" &&
				Number.isFinite(detail.startTimeMs)
				? detail.startTimeMs
				: 0;

	if (!detail.video) {
		return Math.max(0, rawStartTimeMs);
	}

	return clampTrackStartTimeMs(rawStartTimeMs);
}

function formatTime(totalSeconds: number): string {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds));
	const minutes = Math.floor(safeSeconds / 60)
		.toString()
		.padStart(2, "0");
	const seconds = (safeSeconds % 60).toString().padStart(2, "0");
	return `${minutes}:${seconds}`;
}

function getTrackLocalTimeSec(track: EditorTrack): number {
	return currentTimeSec.value - track.startTimeMs / 1000;
}

function getClampedTrackLocalTimeSec(track: EditorTrack): number {
	return Math.min(track.video.duration, Math.max(0, getTrackLocalTimeSec(track)));
}

function hasSoloedTracks(): boolean {
	return tracks.value.some((track) => track.isSoloed);
}

function isTrackAudible(track: EditorTrack): boolean {
	if (track.isMuted) {
		return false;
	}

	if (!hasSoloedTracks()) {
		return true;
	}

	return track.isSoloed;
}

function syncTrackPlayer(
	player: PlayerLike | null,
	track: EditorTrack,
	forceTimeSync = false,
	syncTimeOnlyOnStateChange = false,
): void {
	if (!player) {
		return;
	}

	player.muted = !isTrackAudible(track);
	player.volume = track.volume;

	const localTimeSec = getTrackLocalTimeSec(track);
	const clampedLocalTimeSec = Math.min(
		track.video.duration,
		Math.max(0, localTimeSec),
	);
	const shouldPlay =
		isPlaying.value &&
		localTimeSec >= 0 &&
		localTimeSec < track.video.duration;
	const currentPlayerTime = player.currentTime;
	const playerSyncState = playerSyncStates.get(track.id);
	const estimatedPlayerTime = playerSyncState
		? playerSyncState.playerTimeSec +
			(playerSyncState.isPlaying
				? (Date.now() - playerSyncState.syncedAtMs) / 1000
				: 0)
		: undefined;
	const referencePlayerTime = playerSyncState
		? estimatedPlayerTime
		: typeof currentPlayerTime === "number" && Number.isFinite(currentPlayerTime)
			? currentPlayerTime
			: undefined;
	const playbackStateChanged = playerSyncState?.isPlaying !== shouldPlay;
	const shouldSyncTime =
		forceTimeSync ||
		playbackStateChanged ||
		(!syncTimeOnlyOnStateChange &&
			(typeof referencePlayerTime !== "number" ||
				!Number.isFinite(referencePlayerTime) ||
				Math.abs(referencePlayerTime - clampedLocalTimeSec) >
					PLAYER_SYNC_DRIFT_THRESHOLD_SEC));
	const resolvedPlayerTime = shouldSyncTime
		? clampedLocalTimeSec
		: (referencePlayerTime ?? clampedLocalTimeSec);

	if (shouldSyncTime) {
		player.currentTime = clampedLocalTimeSec;
	}

	playerSyncStates.set(track.id, {
		playerTimeSec: resolvedPlayerTime,
		syncedAtMs: Date.now(),
		isPlaying: shouldPlay,
	});

	if (!shouldPlay) {
		player.pause?.();
		return;
	}

	void player.play?.();
}

function syncAllPlayers(
	forceTimeSync = false,
	syncTimeOnlyOnStateChange = false,
): void {
	for (const track of tracks.value) {
		syncTrackPlayer(
			syncPlayerRefs.get(track.id) ?? null,
			track,
			forceTimeSync,
			syncTimeOnlyOnStateChange,
		);
	}
}

function setSyncPlayerRef(trackId: string, player: PlayerLike | null): void {
	if (!player) {
		syncPlayerRefs.delete(trackId);
		playerSyncStates.delete(trackId);
		return;
	}

	if (syncPlayerRefs.get(trackId) === player) {
		return;
	}

	syncPlayerRefs.set(trackId, player);
	const track = tracks.value.find((candidate) => candidate.id === trackId);
	if (track) {
		syncTrackPlayer(player, track, true);
	}
}

function syncSelectedPreview(
	forceTimeSync = false,
	syncTimeOnlyOnStateChange = false,
): void {
	const previewPlayer = selectedPreviewRef.value;
	const track = selectedTrack.value;
	if (!previewPlayer || !track) {
		return;
	}

	previewPlayer.muted = true;

	const localTimeSec = getTrackLocalTimeSec(track);
	const clampedLocalTimeSec = Math.min(
		track.video.duration,
		Math.max(0, localTimeSec),
	);
	const shouldPlay =
		isPlaying.value &&
		localTimeSec >= 0 &&
		localTimeSec < track.video.duration;
	const currentPlayerTime = previewPlayer.currentTime;
	const estimatedPlayerTime = selectedPreviewSyncState
		? selectedPreviewSyncState.playerTimeSec +
			(selectedPreviewSyncState.isPlaying
				? (Date.now() - selectedPreviewSyncState.syncedAtMs) / 1000
				: 0)
		: undefined;
	const referencePlayerTime = selectedPreviewSyncState
		? estimatedPlayerTime
		: typeof currentPlayerTime === "number" && Number.isFinite(currentPlayerTime)
			? currentPlayerTime
			: undefined;
	const playbackStateChanged = selectedPreviewSyncState?.isPlaying !== shouldPlay;
	const shouldSyncTime =
		forceTimeSync ||
		playbackStateChanged ||
		(!syncTimeOnlyOnStateChange &&
			(typeof referencePlayerTime !== "number" ||
				!Number.isFinite(referencePlayerTime) ||
				Math.abs(referencePlayerTime - clampedLocalTimeSec) >
					PLAYER_SYNC_DRIFT_THRESHOLD_SEC));
	const resolvedPlayerTime = shouldSyncTime
		? clampedLocalTimeSec
		: (referencePlayerTime ?? clampedLocalTimeSec);

	if (shouldSyncTime) {
		previewPlayer.currentTime = clampedLocalTimeSec;
	}

	selectedPreviewSyncState = {
		playerTimeSec: resolvedPlayerTime,
		syncedAtMs: Date.now(),
		isPlaying: shouldPlay,
	};

	if (!shouldPlay) {
		previewPlayer.pause?.();
		return;
	}

	void previewPlayer.play?.();
}

function setSelectedPreviewRef(player: PlayerLike | null): void {
	selectedPreviewRef.value = player;
	selectedPreviewSyncState = null;
	if (!player) {
		return;
	}

	syncSelectedPreview(true);
}

function navigateBack(): void {
	void router.push({
		name: "SongsManager",
		hash: `#${songId.value}`,
	});
}

function stopPlaybackTimer(): void {
	if (!playbackTimer) {
		return;
	}

	clearInterval(playbackTimer);
	playbackTimer = null;
}

function startPlaybackTimer(): void {
	stopPlaybackTimer();
	lastPlaybackTickMs = Date.now();
	playbackTimer = setInterval(() => {
		const now = Date.now();
		const elapsedMs = now - lastPlaybackTickMs;
		lastPlaybackTickMs = now;
		currentTimeSec.value = Math.min(
			timelineDurationSec.value,
			currentTimeSec.value + elapsedMs / 1000,
		);
		if (currentTimeSec.value >= timelineDurationSec.value) {
			isPlaying.value = false;
			stopPlaybackTimer();
		}
	}, PLAYBACK_TICK_MS);
}

function clearAutosaveTimer(trackId: string): void {
	const timer = autosaveTimers.get(trackId);
	if (!timer) {
		return;
	}

	clearTimeout(timer);
	autosaveTimers.delete(trackId);
}

function clearAutosaveSavedTimers(trackId: string): void {
	const fadeTimer = autosaveFadeTimers.get(trackId);
	if (fadeTimer) {
		clearTimeout(fadeTimer);
		autosaveFadeTimers.delete(trackId);
	}

	const clearTimer = autosaveClearTimers.get(trackId);
	if (clearTimer) {
		clearTimeout(clearTimer);
		autosaveClearTimers.delete(trackId);
	}
}

function setAutosaveStatus(trackId: string, status: AutosaveStatus): void {
	if (status.state !== AUTOSAVE_STATES.saved) {
		clearAutosaveSavedTimers(trackId);
	}

	autosaveStatuses.value = {
		...autosaveStatuses.value,
		[trackId]: status,
	};
}

function setSavedAutosaveStatus(trackId: string): void {
	clearAutosaveSavedTimers(trackId);
	setAutosaveStatus(trackId, {
		state: AUTOSAVE_STATES.saved,
		fadingOut: false,
	});
	autosaveFadeTimers.set(
		trackId,
		setTimeout(() => {
			const currentStatus = autosaveStatuses.value[trackId];
			if (currentStatus?.state !== AUTOSAVE_STATES.saved) {
				return;
			}

			autosaveStatuses.value = {
				...autosaveStatuses.value,
				[trackId]: {
					...currentStatus,
					fadingOut: true,
				},
			};
			autosaveFadeTimers.delete(trackId);
		}, AUTOSAVE_SAVED_VISIBLE_MS),
	);
	autosaveClearTimers.set(
		trackId,
		setTimeout(() => {
			const nextStatuses = { ...autosaveStatuses.value };
			if (nextStatuses[trackId]?.state === AUTOSAVE_STATES.saved) {
				delete nextStatuses[trackId];
				autosaveStatuses.value = nextStatuses;
			}
			autosaveClearTimers.delete(trackId);
		}, AUTOSAVE_SAVED_VISIBLE_MS + AUTOSAVE_SAVED_FADE_MS),
	);
}

async function saveTrackStartTime(trackId: string): Promise<void> {
	const track = tracks.value.find((candidate) => candidate.id === trackId);
	if (!track) {
		return;
	}

	if (!track.instrumentId) {
		setAutosaveStatus(trackId, {
			state: AUTOSAVE_STATES.error,
			message: t('dashboard.trackEditor.errors.missingInstrument'),
		});
		return;
	}

	const startTimeMs = clampTrackStartTimeMs(track.startTimeMs);
	if (startTimeMs !== track.startTimeMs) {
		tracks.value = tracks.value.map((candidate) =>
			candidate.id === trackId
				? {
					...candidate,
					startTimeMs,
				}
				: candidate,
		);
	}

	setAutosaveStatus(trackId, {
		state: AUTOSAVE_STATES.saving,
	});

	try {
		await updateSongInstrumentVideoStartTimeUseCase.run(
			songId.value,
			track.id,
			startTimeMs,
		);
		setSavedAutosaveStatus(trackId);
	} catch {
		setAutosaveStatus(trackId, {
			state: AUTOSAVE_STATES.error,
			message: t('dashboard.trackEditor.errors.saveFailed'),
		});
		toastStore.error(
			t('dashboard.trackEditor.errors.syncSaveFailed'),
		);
	}
}

function scheduleTrackAutosave(trackId: string): void {
	clearAutosaveTimer(trackId);
	setAutosaveStatus(trackId, {
		state: AUTOSAVE_STATES.pending,
	});
	autosaveTimers.set(
		trackId,
		setTimeout(() => {
			autosaveTimers.delete(trackId);
			void saveTrackStartTime(trackId);
		}, AUTOSAVE_DEBOUNCE_MS),
	);
}

function updateTrackStartTime(trackId: string, nextStartTimeMs: number): void {
	let didChange = false;

	tracks.value = tracks.value.map((track) => {
		if (track.id !== trackId || track.isOriginalAudio) {
			return track;
		}

		const clampedStartTimeMs = clampTrackStartTimeMs(
			Math.round(nextStartTimeMs),
		);
		if (clampedStartTimeMs === track.startTimeMs) {
			return track;
		}

		didChange = true;
		return {
			...track,
			startTimeMs: clampedStartTimeMs,
		};
	});

	if (!didChange) {
		return;
	}

	scheduleTrackAutosave(trackId);
	syncAllPlayers(true);
}

function resolveTimelineZoomStorage(): Storage | null {
	if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
		return null;
	}

	return globalThis.localStorage;
}

function readSavedTimelineZooms(): Record<string, number> {
	const storage = resolveTimelineZoomStorage();
	if (!storage) {
		return {};
	}

	try {
		const rawValue = storage.getItem(TIMELINE_ZOOM_STORAGE_KEY);
		if (!rawValue) {
			return {};
		}

		const parsedValue = JSON.parse(rawValue);
		if (!parsedValue || typeof parsedValue !== "object") {
			return {};
		}

		return Object.entries(parsedValue).reduce<Record<string, number>>(
			(zoomsBySongId, [entrySongId, entryZoom]) => {
				if (typeof entryZoom === "number" && Number.isFinite(entryZoom)) {
					zoomsBySongId[entrySongId] = entryZoom;
				}
				return zoomsBySongId;
			},
			{},
		);
	} catch {
		return {};
	}
}

function writeSavedTimelineZoom(songIdValue: string, zoomPercent: number): void {
	const storage = resolveTimelineZoomStorage();
	if (!storage || songIdValue.length === 0) {
		return;
	}

	try {
		storage.setItem(
			TIMELINE_ZOOM_STORAGE_KEY,
			JSON.stringify({
				...readSavedTimelineZooms(),
				[songIdValue]: zoomPercent,
			}),
		);
	} catch {
		return;
	}
}

function applyTimelineZoom(zoomPercent: number): void {
	timelineZoomPercent.value = Math.min(
		MAX_TIMELINE_ZOOM_PERCENT,
		Math.max(1, Math.round(zoomPercent)),
	);
}

function calculateFitTimelineZoomPercent(): number {
	const preferredInnerWidth = timelineScrollWrapperRef.value?.clientWidth;
	const fallbackBoundingWidth =
		timelineScrollWrapperRef.value?.getBoundingClientRect?.().width;
	const containerWidth =
		typeof preferredInnerWidth === "number" && Number.isFinite(preferredInnerWidth) && preferredInnerWidth > 0
			? preferredInnerWidth
			: fallbackBoundingWidth ?? BASE_TIMELINE_WIDTH_PX;

	if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
		return MIN_TIMELINE_ZOOM_PERCENT;
	}

	return (containerWidth / BASE_TIMELINE_WIDTH_PX) * 100;
}

function applyInitialTimelineZoom(): void {
	const savedZoomPercent = readSavedTimelineZooms()[songId.value];
	if (typeof savedZoomPercent === "number" && Number.isFinite(savedZoomPercent)) {
		applyTimelineZoom(savedZoomPercent);
		return;
	}

	applyTimelineZoom(calculateFitTimelineZoomPercent());
}

function handleTimelineZoomInput(rawValue: string): void {
	const nextValue = Number.parseInt(rawValue, 10);
	if (!Number.isFinite(nextValue)) {
		return;
	}

	applyTimelineZoom(
		Math.min(
			MAX_TIMELINE_ZOOM_PERCENT,
			Math.max(MIN_TIMELINE_ZOOM_PERCENT, nextValue),
		),
	);
	writeSavedTimelineZoom(songId.value, timelineZoomPercent.value);
}

function nudgeTimelineZoom(deltaPercent: number): void {
	handleTimelineZoomInput(String(timelineZoomPercent.value + deltaPercent));
}

function handleTrackStartTimeInput(trackId: string, rawValue: string): void {
	const nextValue = Number.parseInt(rawValue.trim(), 10);
	if (!Number.isFinite(nextValue)) {
		return;
	}

	updateTrackStartTime(trackId, nextValue);
}

function convertTimelineOffsetPxToTimeSec(offsetPx: number): number {
	if (timelineContentWidthPx.value <= 0) {
		return 0;
	}

	return (
		(clampTimelineOffsetPx(offsetPx) / timelineContentWidthPx.value) *
		(timelineWindowMs.value / 1000)
	);
}

function convertClientXToTimelineOffsetPx(event: TimelineSeekEventLike): number {
	const bounds = hasBoundingClientRect(event.currentTarget)
		? event.currentTarget.getBoundingClientRect()
		: undefined;
	if (typeof event.clientX === "number" && bounds) {
		return clampTimelineOffsetPx(event.clientX - bounds.left);
	}

	return clampTimelineOffsetPx(event.offsetX ?? 0);
}

function convertTimelineDeltaPxToMs(deltaPx: number): number {
	if (timelinePixelsPerMs.value === 0) {
		return 0;
	}

	return Math.round(deltaPx / timelinePixelsPerMs.value);
}

function setPlaybackTime(nextTimeSec: number): void {
	currentTimeSec.value = Math.max(
		0,
		Math.min(timelineDurationSec.value, nextTimeSec),
	);
	syncAllPlayers(true);
}

function goToStart(): void {
	if (isAnyTrackAudioLoadingNow()) {
		return;
	}

	setPlaybackTime(0);
}

function nudgePlayback(deltaSec: number): void {
	if (isAnyTrackAudioLoadingNow()) {
		return;
	}

	setPlaybackTime(currentTimeSec.value + deltaSec);
}

function startTrackDrag(trackId: string, event: TrackDragEventLike): void {
	const track = tracks.value.find((candidate) => candidate.id === trackId);
	if (!track || track.isOriginalAudio) {
		return;
	}

	selectTrack(trackId);

	event.preventDefault?.();
	dragState.value = {
		trackId,
		startClientX: event.clientX ?? 0,
		initialStartTimeMs: track.startTimeMs,
		pointerId: event.pointerId ?? null,
	};
	if (typeof event.pointerId === "number" && hasPointerCapture(event.currentTarget)) {
		event.currentTarget.setPointerCapture(event.pointerId);
	}
}

function moveTrackDrag(trackId: string, event: TrackDragEventLike): void {
	if (!dragState.value || dragState.value.trackId !== trackId) {
		return;
	}

	event.preventDefault?.();
	const deltaPx =
		(event.clientX ?? dragState.value.startClientX) -
		dragState.value.startClientX;
	const deltaMs = convertTimelineDeltaPxToMs(deltaPx);
	updateTrackStartTime(trackId, dragState.value.initialStartTimeMs + deltaMs);
}

function endTrackDrag(trackId: string, event: TrackDragEventLike): void {
	if (!dragState.value || dragState.value.trackId !== trackId) {
		return;
	}

	moveTrackDrag(trackId, event);
	if (
		typeof dragState.value.pointerId === "number" &&
		hasPointerCapture(event.currentTarget)
	) {
		event.currentTarget.releasePointerCapture(dragState.value.pointerId);
	}
	dragState.value = null;
}

function togglePlayback(): void {
	if (timelineDurationSec.value === 0 || isAnyTrackAudioLoadingNow()) {
		return;
	}

	if (currentTimeSec.value >= timelineDurationSec.value) {
		currentTimeSec.value = 0;
	}

	isPlaying.value = !isPlaying.value;
}

function closeZoomPopover(): void {
	isZoomPopoverOpen.value = false;
}

function toggleZoomPopover(): void {
	isZoomPopoverOpen.value = !isZoomPopoverOpen.value;
}

function openHelpModal(): void {
	isHelpModalOpen.value = true;
}

function closeHelpModal(): void {
	isHelpModalOpen.value = false;
}

useModalFocusTrap(helpModalRef, isHelpModalOpen, { onEscape: closeHelpModal });

function handleTimelineRulerClick(event: TimelineSeekEventLike): void {
	if (timelineContentWidthPx.value <= 0) {
		return;
	}

	setPlaybackTime(
		convertTimelineOffsetPxToTimeSec(convertClientXToTimelineOffsetPx(event)),
	);
}

function selectTrack(trackId: string): void {
	selectedTrackId.value = trackId;
	syncAllPlayers();
}

function toggleTrackMute(trackId: string): void {
	tracks.value = tracks.value.map((track) =>
		track.id === trackId
			? {
				...track,
				isMuted: !track.isMuted,
			}
			: track,
	);
	syncAllPlayers(false, true);
}

function setTrackVolume(trackId: string, volume: number): void {
	const clampedVolume = Math.min(1, Math.max(0, volume));
	tracks.value = tracks.value.map((track) =>
		track.id === trackId
			? {
				...track,
				volume: clampedVolume,
			}
			: track,
	);
	syncAllPlayers(false, true);
}

function handleTrackVolumeInput(trackId: string, rawValue: string): void {
	const nextValue = Number.parseInt(rawValue, 10);
	if (!Number.isFinite(nextValue)) {
		return;
	}

	setTrackVolume(trackId, nextValue / 100);
}

function getTrackVolumePercent(track: EditorTrack): number {
	return Math.round(track.volume * 100);
}

function toggleTrackSolo(trackId: string): void {
	tracks.value = tracks.value.map((track) =>
		track.id === trackId
			? {
				...track,
				isSoloed: !track.isSoloed,
			}
			: track,
	);
	syncAllPlayers(false, true);
}

function getTrackOffsetPx(track: EditorTrack): number {
	return convertTimelineMsToPx(track.startTimeMs);
}

function getTrackWidthPx(track: EditorTrack): number {
	return Math.max(convertTimelineMsToPx(track.video.duration * 1000), 12);
}

function getTrackAudioSrc(track: EditorTrack): string | undefined {
	const state = getTrackWaveformState(track.video.url);
	if (state.status === "ready") {
		return state.asset.objectUrl;
	}

	if (state.status === "error") {
		// Waveform decoding failed (unsupported browser, CORS, network error): fall back
		// to the direct URL so playback still works, even though the shared-download and
		// waveform benefits are lost for this track.
		return track.video.url;
	}

	// While the shared download is still in flight, leave the element without a src
	// rather than pointing it at the remote URL too, so the file isn't fetched twice.
	return undefined;
}

// The audio element's src is assigned imperatively (not via a reactive `:src` binding) so
// that waveform state updates don't force the whole component to re-render — that used to
// re-trigger every inline template ref callback (including the selected-track preview's),
// resyncing play/pause state unnecessarily.
interface AudioElementLike {
	src: string;
}

function isAudioElementLike(value: unknown): value is AudioElementLike {
	return !!value && typeof value === "object";
}

function applyTrackAudioSrc(trackId: string): void {
	const element = trackAudioElementRefs.get(trackId);
	const track = tracks.value.find((candidate) => candidate.id === trackId);
	if (!element || !track || track.isOriginalAudio) {
		return;
	}

	const nextSrc = getTrackAudioSrc(track);
	if (typeof nextSrc === "string" && element.src !== nextSrc) {
		element.src = nextSrc;
	}
}

function applyAllTrackAudioSrcs(): void {
	for (const trackId of trackAudioElementRefs.keys()) {
		applyTrackAudioSrc(trackId);
	}
}

function isButtonElementLike(value: unknown): value is ButtonElementLike {
	return !!value && typeof value === "object";
}

function setTransportButtonRef(key: string, element: unknown): void {
	if (!isButtonElementLike(element)) {
		transportButtonRefs.delete(key);
		return;
	}

	transportButtonRefs.set(key, element);
	applyTransportButtonsLoadingState();
}

// Imperative for the same reason the audio src is: keeping isAnyTrackAudioLoadingNow()
// out of the render function avoids forcing a full re-render (and the resulting inline
// ref churn) every time a track's waveform state settles.
function applyTransportButtonsLoadingState(): void {
	const isLoading = isAnyTrackAudioLoadingNow();
	const loadingTitle = t('dashboard.trackEditor.loadingAudioTitle');
	const defaultTitles: Record<string, string> = {
		play: t('dashboard.trackEditor.playTitle'),
		goToStart: t('dashboard.trackEditor.goToStartTitle'),
		rewind: t('dashboard.trackEditor.rewindTitle'),
		forward: t('dashboard.trackEditor.forward'),
	};

	for (const [key, button] of transportButtonRefs) {
		button.disabled = isLoading;
		if (typeof button.classList?.toggle === "function") {
			button.classList.toggle('opacity-50', isLoading);
		}
		button.title = isLoading ? loadingTitle : (defaultTitles[key] ?? button.title);
	}
}

function isClassListElementLike(value: unknown): value is ClassListElementLike {
	return (
		!!value &&
		typeof value === "object" &&
		typeof (value as { classList?: { toggle?: unknown } }).classList?.toggle === "function"
	);
}

function applyPreparingTracksOverlayVisibility(): void {
	preparingTracksOverlayElement?.classList.toggle("show", isPreparingTracksNow);
}

function setPreparingTracksOverlayRef(element: unknown): void {
	preparingTracksOverlayElement = isClassListElementLike(element) ? element : null;
	applyPreparingTracksOverlayVisibility();
}

function updatePreparingTracksState(): void {
	isPreparingTracksNow = isAnyTrackAudioLoadingNow();
	applyPreparingTracksOverlayVisibility();
}

function setTrackAudioElementRef(trackId: string, element: unknown): void {
	if (!isAudioElementLike(element)) {
		trackAudioElementRefs.delete(trackId);
		return;
	}

	trackAudioElementRefs.set(trackId, element);
	applyTrackAudioSrc(trackId);
}

function getTrackWaveformCanvasWidthPx(track: EditorTrack): number {
	return Math.max(1, Math.round(getTrackWidthPx(track)));
}

function setTrackWaveformCanvasRef(
	trackId: string,
	element: HTMLCanvasElement | null,
): void {
	if (!element) {
		trackWaveformCanvasRefs.delete(trackId);
		return;
	}

	trackWaveformCanvasRefs.set(trackId, element);
	drawTrackWaveformCanvas(trackId);
}

function drawTrackWaveformCanvas(trackId: string): void {
	const canvas = trackWaveformCanvasRefs.get(trackId);
	const track = tracks.value.find((candidate) => candidate.id === trackId);
	if (
		!canvas ||
		!track ||
		track.isOriginalAudio ||
		typeof canvas.getContext !== "function"
	) {
		return;
	}

	const context = canvas.getContext("2d");
	if (!context) {
		return;
	}

	const widthPx = getTrackWaveformCanvasWidthPx(track);
	const heightPx = WAVEFORM_CANVAS_HEIGHT_PX;
	canvas.width = widthPx;
	canvas.height = heightPx;
	context.clearRect(0, 0, widthPx, heightPx);

	const state = getTrackWaveformState(track.video.url);
	if (state.status !== "ready") {
		return;
	}

	const peaks = resamplePeaksToWidth(state.asset.peaks, widthPx);
	const midY = heightPx / 2;
	context.fillStyle = "rgba(255, 255, 255, 0.55)";
	for (let x = 0; x < peaks.length; x += 1) {
		const barHeight = Math.max(1, peaks[x] * heightPx);
		context.fillRect(x, midY - barHeight / 2, 1, barHeight);
	}
}

function redrawAllTrackWaveformCanvases(): void {
	for (const trackId of trackWaveformCanvasRefs.keys()) {
		drawTrackWaveformCanvas(trackId);
	}
}

function getAutosaveSpinnerClass(trackId: string): string {
	return autosaveStatuses.value[trackId]?.state === AUTOSAVE_STATES.pending
		? "spinner-border spinner-border-sm text-secondary"
		: "spinner-border spinner-border-sm text-primary";
}

function getTrackMetaCardClass(track: EditorTrack): string[] {
	return [
		"border",
		"p-3",
		"d-flex",
		"flex-column",
		"bg-body",
		"shadow-sm",
		"position-relative",
		selectedTrackId.value === track.id
			? "border-primary-subtle bg-primary-subtle bg-opacity-10"
			: "border-secondary-subtle",
	];
}

function getTrackClipClass(track: EditorTrack): string[] {
	return [
		"position-absolute",
		"top-50",
		"border",
		"d-flex",
		"align-items-center",
		"px-2",
		"small",
		"fw-semibold",
		"shadow-sm",
		selectedTrackId.value === track.id
			? "bg-primary-subtle border-primary-subtle text-primary-emphasis"
			: "bg-body-tertiary border-secondary-subtle text-body",
	];
}

function getAutosaveSpinnerStyle(trackId: string): { opacity: number } {
	return {
		opacity:
			autosaveStatuses.value[trackId]?.state === AUTOSAVE_STATES.pending
				? 0.35
				: 1,
	};
}

function getTrackToggleButtonClass(
	isActive: boolean,
	activeClass: string,
): string[] {
	return [
		"btn",
		"btn-sm",
		"rounded-circle",
		"p-0",
		isActive ? activeClass : "btn-outline-secondary",
	];
}

function getTrackToggleButtonStyle(): Record<string, string> {
	return {
		minHeight: "unset",
		lineHeight: "1.1",
		width: "1.75rem",
		height: "1.75rem",
		transform: "none",
		translate: "none",
	};
}

function getTrackSoloTooltipLabel(track: EditorTrack): string {
	return track.isSoloed
		? t('dashboard.trackEditor.soloTooltipActive')
		: t('dashboard.trackEditor.soloTooltipInactive');
}

function getTrackMuteTooltipLabel(track: EditorTrack): string {
	return track.isMuted
		? t('dashboard.trackEditor.muteTooltipActive')
		: t('dashboard.trackEditor.muteTooltipInactive');
}

function setTrackControlTooltipTarget(
	key: string,
	componentOrElement: unknown,
): void {
	const element = isElementRef(componentOrElement) ? componentOrElement : null;
	if (!element) {
		trackControlTooltipTargets.delete(key);
		return;
	}

	trackControlTooltipTargets.set(key, element);
}

function disposeTrackControlTooltips(): void {
	for (const tooltip of trackControlTooltips) {
		tooltip.dispose();
	}
	trackControlTooltips = [];
}

async function syncTrackControlTooltips(): Promise<void> {
	if (!isViewMounted) {
		return;
	}

	await nextTick();
	disposeTrackControlTooltips();
	// animation: false avoids a Bootstrap timing bug where a pending fade
	// transition callback fires after dispose() and throws on a null element.
	trackControlTooltips = Array.from(trackControlTooltipTargets.values()).map(
		(target) => Tooltip.getOrCreateInstance(target, { animation: false }) as TooltipInstance,
	);
}

function createOriginalAudioTrack(): EditorTrack | null {
	const videoId = originalAudioYoutubeVideoId.value;
	const durationMs = originalVideoClipDurationMs.value;
	if (!videoId || durationMs === null || durationMs <= 0) {
		return null;
	}

	return {
		id: ORIGINAL_AUDIO_TRACK_ID,
		name: t('dashboard.trackEditor.originalAudioTrackName'),
		instrumentId: null,
		startTimeMs: 0,
		isMuted: false,
		isSoloed: false,
		volume: 1,
		isOriginalAudio: true,
		video: {
			id: ORIGINAL_AUDIO_TRACK_ID,
			songInstrumentId: songId.value,
			url: originalVideoclipUrl.value,
			duration: durationMs / 1000,
			size: 0,
			createdAt: "",
		},
	};
}

function detachOriginalAudioPlayerHostElement(): void {
	originalAudioPlayerHostElement?.remove();
	originalAudioPlayerHostElement = null;
}

function createOriginalAudioPlayerTargetElement(host: HTMLElement): HTMLElement {
	if (typeof document === "undefined") {
		return host;
	}

	const target = document.createElement("div");
	host.appendChild(target);
	return target;
}

async function setupOriginalAudioPlayer(videoId: string): Promise<void> {
	const requestId = ++originalAudioPlayerRequestId;
	destroyYoutubePlayer();
	detachOriginalAudioPlayerHostElement();
	await nextTick();
	if (!isViewMounted || requestId !== originalAudioPlayerRequestId) {
		return;
	}

	const host = originalAudioPlayerHostRef.value;
	if (!host) {
		return;
	}

	// The YouTube IFrame API replaces this element with its own iframe outside of
	// Vue's control, so it must live in a plain DOM node Vue never re-diffs — otherwise
	// Vue's patch can get confused about this node and corrupt sibling <audio> elements.
	const target = createOriginalAudioPlayerTargetElement(host);
	if (target !== host) {
		originalAudioPlayerHostElement = target;
	}

	try {
		const adapter = await createYoutubePlayer(target, videoId);
		if (!isViewMounted || requestId !== originalAudioPlayerRequestId) {
			return;
		}

		setSyncPlayerRef(ORIGINAL_AUDIO_TRACK_ID, adapter);
	} catch {
		// The original audio reference track is optional; a failed YouTube player
		// shouldn't break the rest of the editor.
	}
}

async function loadTracks(): Promise<void> {
	isLoading.value = true;
	errorMessage.value = "";
	let shouldApplyInitialZoom = false;

	try {
		const instruments = await getSongInstrumentsUseCase.run(songId.value);
		const details = await Promise.all(
			instruments.map((instrument) =>
				getSongInstrumentDetailUseCase.run(songId.value, instrument.id),
			),
		);
		const newOriginalAudioTrack = createOriginalAudioTrack();
		const instrumentTracks = details
			.filter(
				(detail): detail is SongInstrumentDetailResponse & {
					video: NonNullable<SongInstrumentDetailResponse["video"]>;
				} => detail.video !== null,
			)
			.map((detail) => ({
				id: detail.id,
				name: detail.name,
				instrumentId: detail.instrumentId ?? null,
				startTimeMs: extractStartTimeMs(detail),
				isMuted: false,
				isSoloed: false,
				volume: 1,
				video: detail.video,
			}));
		tracks.value = newOriginalAudioTrack
			? [newOriginalAudioTrack, ...instrumentTracks]
			: instrumentTracks;
		for (const track of instrumentTracks) {
			ensureTrackWaveformLoaded(track.video.url);
		}
		updatePreparingTracksState();
		selectedTrackId.value =
			instrumentTracks[0]?.id ?? newOriginalAudioTrack?.id ?? null;
		currentTimeSec.value = 0;
		syncPlayerRefs.clear();
		playerSyncStates.clear();
		selectedPreviewSyncState = null;
		shouldApplyInitialZoom = tracks.value.length > 0;

		if (newOriginalAudioTrack) {
			void setupOriginalAudioPlayer(originalAudioYoutubeVideoId.value as string);
		} else {
			originalAudioPlayerRequestId += 1;
			destroyYoutubePlayer();
			detachOriginalAudioPlayerHostElement();
		}
	} catch {
		errorMessage.value = t('dashboard.trackEditor.errors.loadTracksFailed');
		toastStore.error(errorMessage.value);
	} finally {
		isLoading.value = false;
	}

	if (!shouldApplyInitialZoom) {
		return;
	}

	await nextTick();
	applyInitialTimelineZoom();
}

watch(selectedTrack, () => {
	selectedPreviewSyncState = null;
	syncAllPlayers();
	syncSelectedPreview(true);
});

watch(currentTimeSec, () => {
	syncAllPlayers(false, true);
	syncSelectedPreview(false, true);
});

watch(isPlaying, (playing) => {
	if (playing) {
		startPlaybackTimer();
		syncAllPlayers(true);
		syncSelectedPreview(true);
		return;
	}

	stopPlaybackTimer();
	syncAllPlayers(true);
	syncSelectedPreview(true);
});

watch(
	[timelineZoomPercent, trackWaveformStates],
	() => {
		redrawAllTrackWaveformCanvases();
		applyAllTrackAudioSrcs();
		applyTransportButtonsLoadingState();
		updatePreparingTracksState();
	},
	{ deep: true },
);

function isTypingInFormField(target: EventTarget | null): boolean {
	if (!target || typeof target !== "object") {
		return false;
	}

	const element = target as { tagName?: string; isContentEditable?: boolean };
	return (
		element.tagName === "INPUT" ||
		element.tagName === "TEXTAREA" ||
		element.isContentEditable === true
	);
}

interface ClosestCapableElement {
	closest(selector: string): { blur?: () => void } | null;
}

function isClosestCapableElement(value: unknown): value is ClosestCapableElement {
	return !!value && typeof (value as { closest?: unknown }).closest === "function";
}

function handleGlobalPointerdown(event: Event): void {
	const target = event.target;
	if (!isClosestCapableElement(target)) {
		return;
	}

	const clickedControl = target.closest('button, [role="button"]');
	if (!clickedControl || typeof clickedControl.blur !== "function") {
		return;
	}

	// A mouse click leaves the control focused but the browser suppresses its
	// focus-visible ring for mouse-originated focus — until an unrelated later
	// keypress (e.g. Shift for a shortcut) makes the browser re-evaluate
	// focus-visible and light it up. Dropping focus once the click settles avoids
	// that; keyboard activation (Tab + Enter/Space) never goes through this
	// listener, so it keeps showing the ring as expected.
	if (typeof globalThis.requestAnimationFrame === "function") {
		globalThis.requestAnimationFrame(() => {
			if (typeof document !== "undefined" && document.activeElement === clickedControl) {
				clickedControl.blur?.();
			}
		});
	}
}

function handleGlobalKeydown(event: KeyboardEvent): void {
	if (isHelpModalOpen.value || isTypingInFormField(event.target)) {
		return;
	}

	const isCtrlOrCmd = event.ctrlKey || event.metaKey;

	if (event.key === " " || event.key === "Spacebar") {
		event.preventDefault();
		if (event.shiftKey) {
			isPlaying.value = false;
			goToStart();
			return;
		}

		togglePlayback();
		return;
	}

	if (event.key === "Home") {
		event.preventDefault();
		goToStart();
		return;
	}

	if (event.key === "ArrowRight" && event.shiftKey) {
		event.preventDefault();
		nudgePlayback(1);
		return;
	}

	if (event.key === "ArrowLeft" && event.shiftKey) {
		event.preventDefault();
		nudgePlayback(-1);
		return;
	}

	if (event.key === "ArrowUp" && isCtrlOrCmd) {
		event.preventDefault();
		nudgeTimelineZoom(TIMELINE_ZOOM_STEP_PERCENT);
		return;
	}

	if (event.key === "ArrowDown" && isCtrlOrCmd) {
		event.preventDefault();
		nudgeTimelineZoom(-TIMELINE_ZOOM_STEP_PERCENT);
		return;
	}

	const track = selectedTrack.value;
	if (!track) {
		return;
	}

	if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
		event.preventDefault();
		const stepMs =
			isCtrlOrCmd && event.altKey
				? START_TIME_STEP_MS_CTRL_ALT
				: isCtrlOrCmd
					? START_TIME_STEP_MS_CTRL
					: START_TIME_STEP_MS;
		const direction = event.key === "ArrowRight" ? 1 : -1;
		updateTrackStartTime(track.id, track.startTimeMs + direction * stepMs);
		return;
	}

	if (event.key === "ArrowUp" || event.key === "ArrowDown") {
		event.preventDefault();
		const direction = event.key === "ArrowUp" ? 1 : -1;
		setTrackVolume(
			track.id,
			Math.round((track.volume + direction * TRACK_VOLUME_STEP) * 100) / 100,
		);
		return;
	}

	if (isCtrlOrCmd && event.key.toLowerCase() === "m") {
		event.preventDefault();
		toggleTrackMute(track.id);
		return;
	}

	if (isCtrlOrCmd && event.key.toLowerCase() === "s") {
		event.preventDefault();
		toggleTrackSolo(track.id);
	}
}

onMounted(() => {
	void loadTracks();
	void syncTrackControlTooltips();
	if (typeof globalThis.addEventListener === "function") {
		globalThis.addEventListener("keydown", handleGlobalKeydown);
		globalThis.addEventListener("pointerdown", handleGlobalPointerdown);
	}
});

onUpdated(() => {
	void syncTrackControlTooltips();
});

onBeforeUnmount(() => {
	isViewMounted = false;
	if (typeof globalThis.removeEventListener === "function") {
		globalThis.removeEventListener("keydown", handleGlobalKeydown);
		globalThis.removeEventListener("pointerdown", handleGlobalPointerdown);
	}
	stopPlaybackTimer();
	dragState.value = null;
	disposeTrackControlTooltips();
	trackControlTooltipTargets.clear();
	for (const trackId of autosaveTimers.keys()) {
		clearAutosaveTimer(trackId);
	}
	for (const trackId of autosaveFadeTimers.keys()) {
		clearAutosaveSavedTimers(trackId);
	}
	for (const trackId of autosaveClearTimers.keys()) {
		clearAutosaveSavedTimers(trackId);
	}
});
</script>

<template>
	<section class="container-fluid px-0">
		<div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
			<div>
				<h1 class="h2 mb-1">{{ songTitle }}</h1>
				<p class="text-muted mb-0">{{ $t('dashboard.trackEditor.subtitle') }}</p>
			</div>
			<button
				type="button"
				class="btn btn-outline-secondary"
				@click="navigateBack"
			>
				{{ $t('dashboard.trackEditor.back') }}
			</button>
		</div>

		<div v-if="isLoading" class="card shadow-sm border-0 rounded-4">
			<div class="card-body py-4 d-flex align-items-center gap-3">
				<div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
				<p class="mb-0 text-muted">{{ $t('dashboard.trackEditor.loadingTracks') }}</p>
			</div>
		</div>

		<div v-else-if="errorMessage" class="alert alert-danger" role="alert">
			{{ errorMessage }}
		</div>

		<div v-else-if="tracks.length === 0" class="card shadow-sm border-0 rounded-4">
			<div class="card-body py-4">
				<p class="mb-0 text-muted">
					{{ $t('dashboard.trackEditor.noTracksYet') }}
				</p>
			</div>
		</div>

		<div v-else class="card shadow-sm border-0 rounded-4 overflow-hidden position-relative" data-testid="timeline-editor-card">
			<div
				:ref="(element) => setPreparingTracksOverlayRef(element)"
				data-testid="preparing-tracks-overlay"
				class="preparing-tracks-overlay position-absolute"
				:style="{ inset: '0', zIndex: '10', backgroundColor: 'rgba(0, 0, 0, 0.35)' }"
			>
				<div class="bg-body border rounded-3 shadow-sm px-4 py-3 d-flex align-items-center gap-3">
					<div class="spinner-border" role="status" aria-hidden="true"></div>
					<span class="fw-semibold">{{ $t('dashboard.trackEditor.preparingTracks') }}</span>
				</div>
			</div>
			<div class="card-body p-4 bg-body-tertiary bg-opacity-50">
				<div
					data-testid="editor-summary"
					class="d-flex flex-wrap align-items-center gap-2 mb-3"
				>
					<span class="badge rounded-pill editor-summary-pill px-3 py-2">
						{{ trackCountLabel }}
					</span>
					<span class="badge rounded-pill editor-summary-pill px-3 py-2">
						{{ $t('dashboard.trackEditor.zoomBadge', { percent: timelineZoomPercent }) }}
					</span>
					<span
						v-if="originalVideoClipDurationLabel"
						class="badge rounded-pill editor-summary-pill px-3 py-2"
					>
						{{ originalVideoClipDurationLabel }}
					</span>
					<button
						type="button"
						data-testid="help-button"
						class="badge rounded-pill editor-summary-pill px-3 py-2 border-0 ms-auto d-inline-flex align-items-center gap-1"
						:style="{ transform: 'none', translate: 'none' }"
						@click="openHelpModal"
					>
						<i class="bi bi-question-circle" aria-hidden="true"></i>
						{{ $t('dashboard.trackEditor.helpButtonLabel') }}
					</button>
				</div>
				<div class="d-none" aria-hidden="true">
					<audio
						v-for="track in tracks.filter((candidate) => !candidate.isOriginalAudio)"
						:key="`sync-${track.id}`"
						:data-testid="`sync-audio-${track.id}`"
						:ref="(element) => {
							setSyncPlayerRef(track.id, element as PlayerLike | null);
							setTrackAudioElementRef(track.id, element);
						}"
						preload="auto"
					/>
					<div
						v-if="hasOriginalAudioTrack"
						ref="originalAudioPlayerHostRef"
						:data-testid="`sync-audio-${ORIGINAL_AUDIO_TRACK_ID}`"
					></div>
				</div>

				<section class="d-flex justify-content-center mb-3">
					<div class="w-100" style="max-width: 28rem;">
						<div class="ratio ratio-16x9 overflow-hidden bg-dark-subtle border d-flex align-items-center justify-content-center">
							<video
								v-if="selectedTrack && !selectedTrack.isOriginalAudio"
								:data-testid="'selected-video'"
								:key="selectedTrack.id"
								:ref="(element) => setSelectedPreviewRef(element as PlayerLike | null)"
								class="w-100 h-100 object-fit-contain bg-black"
								:src="selectedTrack.video.url"
								muted
								playsinline
								preload="metadata"
							/>
							<p
								v-else-if="selectedTrack && selectedTrack.isOriginalAudio"
								data-testid="original-audio-preview-note"
								class="text-muted small text-center px-3 mb-0"
							>
								{{ $t('dashboard.trackEditor.originalAudioPreviewNote') }}
							</p>
						</div>
						<p class="small text-muted mb-0 mt-2 text-center">
							{{ $t('dashboard.trackEditor.selectedTrackStartsAt', { time: formatTime(selectedTrackStartSec) }) }}
						</p>
					</div>
				</section>

				<div
					data-testid="track-editor-layout"
					class="d-grid gap-3 align-items-stretch"
					:style="{
						gridTemplateColumns: 'minmax(12.5rem, 12.5rem) minmax(0, 1fr)',
						width: '100%',
					}"
				>
					<section data-testid="track-header-left" class="border p-3 bg-body shadow-sm d-flex flex-column gap-2 position-relative">
						<p
							v-if="originalAudioTrack"
							data-testid="original-audio-header-title"
							class="small fw-semibold text-primary text-center mb-0"
						>
							{{ originalAudioTrack.name }}
						</p>
						<div class="d-flex align-items-center justify-content-between gap-3">
							<div class="d-inline-flex align-items-center gap-2 flex-wrap">
								<button type="button" class="border-0 bg-transparent p-0 text-body d-inline-flex align-items-center justify-content-center" :ref="(element) => setTransportButtonRef('play', element)" :title="$t('dashboard.trackEditor.playTitle')" :style="{ lineHeight: '1', minHeight: 'unset', transform: 'none', translate: 'none' }" @click="togglePlayback">
									<i :class="isPlaying ? 'bi bi-pause-fill fs-5' : 'bi bi-play-fill fs-5'" aria-hidden="true"></i>
									<span class="visually-hidden">{{ isPlaying ? $t('dashboard.trackEditor.pauseVisuallyHidden') : $t('dashboard.trackEditor.playVisuallyHidden') }}</span>
								</button>
								<button type="button" class="border-0 bg-transparent p-0 text-body d-inline-flex align-items-center justify-content-center" :ref="(element) => setTransportButtonRef('goToStart', element)" :title="$t('dashboard.trackEditor.goToStartTitle')" :style="{ lineHeight: '1', minHeight: 'unset', transform: 'none', translate: 'none' }" @click="goToStart">
									<i class="bi bi-skip-start-fill fs-5" aria-hidden="true"></i>
									<span class="visually-hidden">{{ $t('dashboard.trackEditor.goToStartVisuallyHidden') }}</span>
								</button>
								<button type="button" class="border-0 bg-transparent p-0 text-body d-inline-flex align-items-center justify-content-center" :ref="(element) => setTransportButtonRef('rewind', element)" :title="$t('dashboard.trackEditor.rewindTitle')" :style="{ lineHeight: '1', minHeight: 'unset', transform: 'none', translate: 'none' }" @click="nudgePlayback(-1)">
									<i class="bi bi-rewind-fill fs-5" aria-hidden="true"></i>
									<span class="visually-hidden">{{ $t('dashboard.trackEditor.rewindVisuallyHidden') }}</span>
								</button>
								<button type="button" class="border-0 bg-transparent p-0 text-body d-inline-flex align-items-center justify-content-center" :ref="(element) => setTransportButtonRef('forward', element)" :title="$t('dashboard.trackEditor.forward')" :style="{ lineHeight: '1', minHeight: 'unset', transform: 'none', translate: 'none' }" @click="nudgePlayback(1)">
									<i class="bi bi-fast-forward-fill fs-5" aria-hidden="true"></i>
									<span class="visually-hidden">{{ $t('dashboard.trackEditor.forward') }}</span>
								</button>
							</div>
							<div class="position-relative hover-popover-group">
								<button type="button" class="border-0 bg-transparent p-0 text-body d-inline-flex align-items-center justify-content-center" :title="$t('dashboard.trackEditor.zoomTitle')" :style="{ lineHeight: '1', minHeight: 'unset', transform: 'none', translate: 'none' }" @click="toggleZoomPopover">
									<i class="bi bi-zoom-in fs-6" aria-hidden="true"></i>
									<span class="visually-hidden">{{ $t('dashboard.trackEditor.zoomVisuallyHidden') }}</span>
								</button>
								<div
									v-if="isZoomPopoverOpen"
									data-testid="zoom-popover-backdrop"
									:style="{ position: 'fixed', inset: '0', zIndex: '2' }"
									@click="closeZoomPopover"
								></div>
								<div
									data-testid="zoom-popover"
									class="hover-popover border bg-body p-2 shadow-sm"
									:class="{ show: isZoomPopoverOpen }"
									:style="{
										position: 'absolute',
										top: '100%',
										right: '0',
										width: '10rem',
										zIndex: '3',
									}"
									@keydown.esc="closeZoomPopover"
								>
									<input
										id="timeline-zoom-input"
										data-testid="timeline-zoom-input"
										type="range"
										class="form-range mb-0"
										:aria-label="$t('dashboard.trackEditor.zoomVisuallyHidden')"
										:min="MIN_TIMELINE_ZOOM_PERCENT"
										:max="MAX_TIMELINE_ZOOM_PERCENT"
										:step="TIMELINE_ZOOM_STEP_PERCENT"
										:value="timelineZoomPercent"
										@input="handleTimelineZoomInput(String(($event.target as HTMLInputElement).value))"
									/>
								</div>
							</div>
						</div>
						<div
							data-testid="transport-time-row"
							class="small text-muted d-flex align-items-center justify-content-between gap-2"
						>
							<span>
								<span data-testid="timeline-current">{{ formatTime(currentTimeSec) }}</span>
								 /
								<span data-testid="timeline-duration">{{ formatTime(timelineDurationSec) }}</span>
							</span>
							<div v-if="originalAudioTrack" class="d-flex align-items-center gap-1 flex-shrink-0">
								<button
									type="button"
									:data-testid="`track-solo-toggle-${originalAudioTrack.id}`"
									:ref="(element) => setTrackControlTooltipTarget(`solo-${originalAudioTrack!.id}`, element)"
									:class="getTrackToggleButtonClass(originalAudioTrack.isSoloed, 'btn-primary')"
									:style="getTrackToggleButtonStyle()"
									:aria-pressed="originalAudioTrack.isSoloed"
									data-bs-toggle="tooltip"
									:data-bs-title="getTrackSoloTooltipLabel(originalAudioTrack)"
									@click="toggleTrackSolo(originalAudioTrack.id)"
								>
									<span class="fw-semibold">S</span>
									<span class="visually-hidden">{{ originalAudioTrack.isSoloed ? $t('dashboard.trackEditor.soloTooltipActive') : $t('dashboard.trackEditor.soloLabelInactive') }}</span>
								</button>
								<div class="position-relative hover-popover-group">
									<button
										type="button"
										:data-testid="`track-mute-toggle-${originalAudioTrack.id}`"
										:ref="(element) => setTrackControlTooltipTarget(`mute-${originalAudioTrack!.id}`, element)"
										:class="getTrackToggleButtonClass(originalAudioTrack.isMuted, 'btn-primary')"
										:style="getTrackToggleButtonStyle()"
										:aria-pressed="originalAudioTrack.isMuted"
										data-bs-toggle="tooltip"
										:data-bs-title="getTrackMuteTooltipLabel(originalAudioTrack)"
										@click="toggleTrackMute(originalAudioTrack.id)"
									>
										<i
											:class="originalAudioTrack.isMuted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill'"
											aria-hidden="true"
										></i>
										<span class="visually-hidden">{{ originalAudioTrack.isMuted ? $t('dashboard.trackEditor.muteTooltipActive') : $t('dashboard.trackEditor.muteLabelInactive') }}</span>
									</button>
									<div
										:data-testid="`track-volume-popover-${originalAudioTrack.id}`"
										class="hover-popover border bg-body p-2 shadow-sm"
										:style="{
											position: 'absolute',
											top: '100%',
											right: '0',
											width: '8rem',
											zIndex: '3',
										}"
									>
										<input
											:data-testid="`track-volume-input-${originalAudioTrack.id}`"
											type="range"
											class="form-range mb-0"
											:aria-label="$t('dashboard.trackEditor.volumeVisuallyHidden')"
											min="0"
											max="100"
											step="1"
											:value="getTrackVolumePercent(originalAudioTrack)"
											@input="handleTrackVolumeInput(originalAudioTrack!.id, ($event.target as HTMLInputElement).value)"
										/>
									</div>
								</div>
							</div>
						</div>
					</section>
					<section data-testid="track-header-right" class="border bg-body shadow-sm overflow-hidden position-relative">
						<div ref="timelineScrollWrapperRef" data-testid="timeline-scroll-wrapper" class="overflow-x-auto overflow-y-hidden h-100 d-flex align-items-stretch">
							<div
								data-testid="timeline-scroll-content"
								class="position-relative overflow-hidden h-100"
								@click="handleTimelineRulerClick($event)"
								:style="{
									width: `${timelineContentWidthPx}px`,
									minWidth: `${timelineContentWidthPx}px`,
								}"
							>
								<div
									data-testid="global-playhead"
									class="position-absolute top-0 bottom-0 z-2"
									:style="getPlayheadLineStyle()"
								></div>
								<div data-testid="timeline-ruler-surface" class="position-relative overflow-hidden border bg-body px-3 py-4 h-100" :style="{ minHeight: '4rem', cursor: 'pointer' }">
									<div
										v-for="(marker, index) in timelineMarkers"
										:key="`timeline-marker-${marker.second}`"
										class="position-absolute top-0 bottom-0"
										:style="getTimelineMarkerStyle(marker, index, timelineMarkers.length)"
									>
										<div class="small text-muted fw-semibold bg-body px-1" :data-testid="`timeline-marker-${marker.second}`">
											{{ formatTime(marker.second) }}
										</div>
										<div class="border-start border-secondary-subtle h-100 mt-1"></div>
									</div>
								</div>
							</div>
						</div>
					</section>

					<div
						data-testid="track-list"
						class="d-grid gap-3"
						:style="{ gridTemplateColumns: 'minmax(12.5rem, 12.5rem) minmax(0, 1fr)', width: '100%', minWidth: '0', gridColumn: '1 / -1' }"
					>
						<template v-for="track in tracks.filter((candidate) => !candidate.isOriginalAudio)" :key="track.id">
							<section
								:data-testid="`track-meta-${track.id}`"
								:class="getTrackMetaCardClass(track)"
								:style="{ maxWidth: '200px', minHeight: '100%', gap: '5px' }"
							>
								<div class="d-flex align-items-start justify-content-between gap-2">
									<button
										type="button"
										class="btn btn-sm text-start px-0 py-0 border-0 flex-grow-1"
										:class="selectedTrackId === track.id ? 'fw-semibold text-primary' : 'text-body'"
										:style="{ minHeight: 'unset', transform: 'none', translate: 'none' }"
										@click="selectTrack(track.id)"
									>
										<span
											:data-testid="`track-title-${track.id}`"
											class="d-block"
											:style="{
												display: 'block',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}"
										>
											{{ track.name }}
										</span>
									</button>
								</div>
								<label class="d-flex align-items-center gap-2 small text-muted fw-semibold">
									<span>{{ $t('dashboard.trackEditor.startsAtLabel') }}</span>
									<div class="input-group input-group-sm">
										<input
											:data-testid="`track-start-time-input-${track.id}`"
											type="text"
											class="form-control"
											:style="{ minHeight: 'unset', padding: '4px 10px', borderRadius: '0' }"
											inputmode="numeric"
											:value="String(track.startTimeMs)"
											@input="handleTrackStartTimeInput(track.id, String(($event.target as HTMLInputElement).value))"
										/>
										<span class="input-group-text" :style="{ borderRadius: '0' }">ms</span>
									</div>
								</label>
								<div
									:data-testid="`track-duration-row-${track.id}`"
									class="small text-muted d-flex align-items-center justify-content-between flex-nowrap gap-2"
									:style="{ minHeight: '1.5rem', marginTop: '0', marginBottom: '0' }"
								>
									<span :style="{ whiteSpace: 'nowrap' }">
										<span :data-testid="`track-current-time-${track.id}`">{{ formatTime(getClampedTrackLocalTimeSec(track)) }}</span>
										 /
										<span>{{ formatTime(track.video.duration) }}</span>
									</span>
									<div class="d-flex align-items-center gap-1 flex-shrink-0">
										<button
											type="button"
											:data-testid="`track-solo-toggle-${track.id}`"
											:ref="(element) => setTrackControlTooltipTarget(`solo-${track.id}`, element)"
											:class="getTrackToggleButtonClass(track.isSoloed, 'btn-primary')"
											:style="getTrackToggleButtonStyle()"
											:aria-pressed="track.isSoloed"
											data-bs-toggle="tooltip"
											:data-bs-title="getTrackSoloTooltipLabel(track)"
											@click="toggleTrackSolo(track.id)"
										>
											<span class="fw-semibold">S</span>
											<span class="visually-hidden">{{ track.isSoloed ? $t('dashboard.trackEditor.soloTooltipActive') : $t('dashboard.trackEditor.soloLabelInactive') }}</span>
										</button>
										<div class="position-relative hover-popover-group">
											<button
												type="button"
												:data-testid="`track-mute-toggle-${track.id}`"
												:ref="(element) => setTrackControlTooltipTarget(`mute-${track.id}`, element)"
												:class="getTrackToggleButtonClass(track.isMuted, 'btn-primary')"
												:style="getTrackToggleButtonStyle()"
												:aria-pressed="track.isMuted"
												data-bs-toggle="tooltip"
												:data-bs-title="getTrackMuteTooltipLabel(track)"
												@click="toggleTrackMute(track.id)"
											>
												<i
													:class="track.isMuted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill'"
													aria-hidden="true"
												></i>
												<span class="visually-hidden">{{ track.isMuted ? $t('dashboard.trackEditor.muteTooltipActive') : $t('dashboard.trackEditor.muteLabelInactive') }}</span>
											</button>
											<div
												:data-testid="`track-volume-popover-${track.id}`"
												class="hover-popover border bg-body p-2 shadow-sm"
												:style="{
													position: 'absolute',
													top: '100%',
													right: '0',
													width: '8rem',
													zIndex: '3',
												}"
											>
												<input
													:data-testid="`track-volume-input-${track.id}`"
													type="range"
													class="form-range mb-0"
													:aria-label="$t('dashboard.trackEditor.volumeVisuallyHidden')"
													min="0"
													max="100"
													step="1"
													:value="getTrackVolumePercent(track)"
													@input="handleTrackVolumeInput(track.id, ($event.target as HTMLInputElement).value)"
												/>
											</div>
										</div>
									</div>
								</div>
								<span
									v-if="autosaveStatuses[track.id]"
									:data-testid="`track-autosave-overlay-${track.id}`"
									class="d-inline-flex align-items-center justify-content-end"
									:style="{
										position: 'absolute',
										right: '0.5rem',
										top: '0.5rem',
										minWidth: '1.5rem',
										minHeight: '1.5rem',
									}"
								>
									<i
										v-if="([
											AUTOSAVE_STATES.pending,
											AUTOSAVE_STATES.saving,
										] as AutosaveState[]).includes(autosaveStatuses[track.id]?.state ?? AUTOSAVE_STATES.idle)"
										:data-testid="`autosave-saving-icon-${track.id}`"
										:class="getAutosaveSpinnerClass(track.id)"
										:style="getAutosaveSpinnerStyle(track.id)"
										role="status"
										:aria-label="autosaveStatuses[track.id]?.state === AUTOSAVE_STATES.pending ? $t('dashboard.trackEditor.pendingSave') : $t('dashboard.trackEditor.saving')"
									></i>
									<i
										v-else-if="autosaveStatuses[track.id]?.state === AUTOSAVE_STATES.saved"
										:data-testid="`autosave-saved-icon-${track.id}`"
										class="bi bi-check-circle-fill text-success"
										:style="{
											opacity: autosaveStatuses[track.id]?.fadingOut ? 0 : 1,
											transition: `opacity ${AUTOSAVE_SAVED_FADE_MS / 1000}s linear`,
										}"
										:aria-label="$t('dashboard.trackEditor.saved')"
									></i>
									<span
										v-else-if="autosaveStatuses[track.id]?.state === AUTOSAVE_STATES.error"
										:data-testid="`autosave-error-${track.id}`"
										class="text-danger-emphasis text-end"
									>
										{{ autosaveStatuses[track.id]?.message }}
									</span>
								</span>
							</section>

							<section
								:data-testid="`track-lane-${track.id}`"
								class="border position-relative bg-dark-subtle shadow-sm overflow-hidden d-flex align-items-stretch"
								:style="{ padding: '0', width: '100%', minHeight: '4rem', cursor: 'pointer' }"
								@click="selectTrack(track.id)"
							>
								<div :data-testid="`track-lane-scroll-wrapper-${track.id}`" class="overflow-x-auto overflow-y-hidden w-100 h-100 d-flex align-items-stretch">
									<div
										class="position-relative overflow-hidden h-100"
										:style="{
											width: `${timelineContentWidthPx}px`,
											minWidth: `${timelineContentWidthPx}px`,
											minHeight: '4rem',
										}"
									>
										<div
											class="position-absolute top-50 start-0 end-0 border-top border-secondary-subtle"
											style="transform: translateY(-50%); opacity: 0.8;"
										></div>
										<div
											:data-testid="`track-playhead-${track.id}`"
											class="position-absolute top-0 bottom-0 z-2"
											:style="getPlayheadLineStyle()"
										></div>
										<div
											:data-testid="`track-clip-${track.id}`"
											:data-start-time-ms="track.startTimeMs"
											:class="getTrackClipClass(track)"
											role="button"
											tabindex="0"
											:style="{
												left: `${getTrackOffsetPx(track)}px`,
												width: `${getTrackWidthPx(track)}px`,
												height: '3.75rem',
												transform: 'translateY(-50%)',
												justifyContent: 'flex-start',
												minWidth: '0.75rem',
												boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
												cursor: 'grab',
												touchAction: 'none',
												userSelect: 'none',
											}"
											@click.stop="selectTrack(track.id)"
											@keydown.enter="selectTrack(track.id)"
											@keydown.space.prevent="selectTrack(track.id)"
											@pointerdown="startTrackDrag(track.id, $event)"
											@pointermove="moveTrackDrag(track.id, $event)"
											@pointerup="endTrackDrag(track.id, $event)"
											@pointercancel="endTrackDrag(track.id, $event)"
										>
											<canvas
												:data-testid="`track-waveform-${track.id}`"
												:ref="(element) => setTrackWaveformCanvasRef(track.id, element as HTMLCanvasElement | null)"
												:width="getTrackWaveformCanvasWidthPx(track)"
												:height="WAVEFORM_CANVAS_HEIGHT_PX"
												:style="{
													position: 'absolute',
													inset: '0',
													width: '100%',
													height: '100%',
													pointerEvents: 'none',
												}"
											></canvas>
										</div>
									</div>
								</div>
							</section>
						</template>
					</div>
				</div>
			</div>
		</div>

		<div v-if="isHelpModalOpen" class="modal-backdrop show"></div>
		<div
			v-if="isHelpModalOpen"
			ref="helpModalRef"
			class="modal d-block"
			tabindex="-1"
			role="dialog"
			aria-modal="true"
			aria-labelledby="trackEditorHelpModalTitle"
			@click.self="closeHelpModal"
		>
			<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
				<div class="modal-content">
					<div class="modal-header">
						<h2 id="trackEditorHelpModalTitle" class="modal-title h5">
							{{ $t('dashboard.trackEditor.helpModalTitle') }}
						</h2>
						<button
							type="button"
							class="btn-close"
							:aria-label="$t('dashboard.trackEditor.helpCloseButton')"
							@click="closeHelpModal"
						></button>
					</div>
					<div class="modal-body">
						<h3 class="h6">{{ $t('dashboard.trackEditor.helpShortcutsTitle') }}</h3>
						<p class="small text-muted">{{ $t('dashboard.trackEditor.helpShortcutsScope') }}</p>
						<div class="table-responsive mb-4">
							<table class="table table-sm align-middle mb-0">
								<tbody>
									<tr
										v-for="shortcut in helpShortcuts"
										:key="shortcut.description"
									>
										<td class="text-nowrap">
											<span
												v-for="(key, index) in shortcut.keys"
												:key="key"
											>
												<span v-if="index > 0" class="mx-1 text-muted">+</span>
												<kbd>{{ key }}</kbd>
											</span>
										</td>
										<td>{{ shortcut.description }}</td>
									</tr>
								</tbody>
							</table>
						</div>
						<h3 class="h6">{{ $t('dashboard.trackEditor.helpGuideTitle') }}</h3>
						<ul class="small mb-0 ps-3">
							<li>{{ $t('dashboard.trackEditor.helpGuideSelectTrack') }}</li>
							<li>{{ $t('dashboard.trackEditor.helpGuideStartField') }}</li>
							<li>{{ $t('dashboard.trackEditor.helpGuideDrag') }}</li>
							<li>{{ $t('dashboard.trackEditor.helpGuideTimeReadout') }}</li>
							<li>{{ $t('dashboard.trackEditor.helpGuideSoloMute') }}</li>
							<li>{{ $t('dashboard.trackEditor.helpGuideZoom') }}</li>
							<li>{{ $t('dashboard.trackEditor.helpGuideWaveform') }}</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.editor-summary-pill {
	background-color: rgba(var(--bs-secondary-rgb), 0.1);
	border: 1px solid rgba(var(--bs-secondary-rgb), 0.25);
	color: var(--bs-body-color);
}

.hover-popover-group {
	/* Extends the hoverable hit area down to where the popover starts (padding is part
	   of the hover box), so moving the mouse from the button to the popover never
	   crosses a dead zone. The negative margin cancels the layout impact, so sibling
	   buttons don't shift. */
	padding-bottom: 0.5rem;
	margin-bottom: -0.5rem;
}

.hover-popover {
	opacity: 0;
	visibility: hidden;
	pointer-events: none;
	/* visibility/pointer-events only flip once the opacity fade-out has fully finished
	   (delay + duration), so the popover stays hoverable through the whole fade — moving
	   the mouse back onto it mid-fade cancels the hide and fades opacity back to 1. */
	transition:
		opacity 0.15s ease 0.25s,
		visibility 0s linear 0.4s,
		pointer-events 0s linear 0.4s;
}

.hover-popover-group:hover .hover-popover,
.hover-popover-group:focus-within .hover-popover,
.hover-popover.show {
	opacity: 1;
	visibility: visible;
	pointer-events: auto;
	transition-delay: 0s;
}

.preparing-tracks-overlay {
	display: none;
}

.preparing-tracks-overlay.show {
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>

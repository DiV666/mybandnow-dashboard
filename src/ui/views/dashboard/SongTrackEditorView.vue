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

interface EditorTrack {
	id: string;
	name: string;
	instrumentId: string | null;
	startTimeMs: number;
	isMuted: boolean;
	isSoloed: boolean;
	video: NonNullable<SongInstrumentDetailResponse["video"]>;
}

interface PlayerLike {
	currentTime?: number;
	muted?: boolean;
	play?: () => Promise<void> | void;
	pause?: () => void;
}

interface PointerCaptureLike {
	setPointerCapture?: (pointerId: number) => void;
	releasePointerCapture?: (pointerId: number) => void;
}

interface TrackDragEventLike {
	clientX?: number;
	pointerId?: number;
	currentTarget?: PointerCaptureLike | null;
	preventDefault?: () => void;
}

interface TimelineSeekTargetLike {
	getBoundingClientRect?: () => {
		left: number;
		width: number;
	};
}

interface TimelineSeekEventLike {
	clientX?: number;
	offsetX?: number;
	currentTarget?: TimelineSeekTargetLike | null;
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
const MIN_TIMELINE_MARKER_SPACING_PX = 72;
const TIMELINE_MARKER_STEP_OPTIONS_SEC = [5, 10, 15, 30, 60, 120, 300, 600];
const TIMELINE_ZOOM_STORAGE_KEY = "song-track-editor-zoom";

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
const selectedTrack = computed(
	() => tracks.value.find((track) => track.id === selectedTrackId.value) ?? null,
);
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

function clampTrackStartTimeMs(_track: EditorTrack, startTimeMs: number): number {
	const nonNegativeStartTimeMs = Math.max(0, startTimeMs);
	if (originalVideoClipDurationMs.value === null) {
		return nonNegativeStartTimeMs;
	}

	return Math.min(nonNegativeStartTimeMs, originalVideoClipDurationMs.value);
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

	return clampTrackStartTimeMs(
		{
			id: detail.id,
			name: detail.name,
			instrumentId: detail.instrumentId ?? null,
			startTimeMs: rawStartTimeMs,
			video: detail.video,
		},
		rawStartTimeMs,
	);
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
		: referencePlayerTime;

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
		: referencePlayerTime;

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

	const startTimeMs = clampTrackStartTimeMs(track, track.startTimeMs);
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
		if (track.id !== trackId) {
			return track;
		}

		const clampedStartTimeMs = clampTrackStartTimeMs(
			track,
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
	const bounds = event.currentTarget?.getBoundingClientRect?.();
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
	setPlaybackTime(0);
}

function nudgePlayback(deltaSec: number): void {
	setPlaybackTime(currentTimeSec.value + deltaSec);
}

function startTrackDrag(trackId: string, event: TrackDragEventLike): void {
	const track = tracks.value.find((candidate) => candidate.id === trackId);
	if (!track) {
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
	if (typeof event.pointerId === "number") {
		event.currentTarget?.setPointerCapture?.(event.pointerId);
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
	if (typeof dragState.value.pointerId === "number") {
		event.currentTarget?.releasePointerCapture?.(dragState.value.pointerId);
	}
	dragState.value = null;
}

function togglePlayback(): void {
	if (timelineDurationSec.value === 0) {
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
		"rounded-pill",
		"px-2",
		"py-0",
		isActive ? activeClass : "btn-outline-secondary",
	];
}

function getTrackToggleButtonStyle(): Record<string, string> {
	return {
		minHeight: "unset",
		lineHeight: "1.1",
		paddingTop: "0.2rem",
		paddingBottom: "0.2rem",
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
	element: Element | null,
): void {
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
	trackControlTooltips = Array.from(trackControlTooltipTargets.values()).map(
		(target) => Tooltip.getOrCreateInstance(target) as TooltipInstance,
	);
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
		tracks.value = details
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
				video: detail.video,
			}));
		selectedTrackId.value = tracks.value[0]?.id ?? null;
		currentTimeSec.value = 0;
		syncPlayerRefs.clear();
		playerSyncStates.clear();
		selectedPreviewSyncState = null;
		shouldApplyInitialZoom = tracks.value.length > 0;
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

onMounted(() => {
	void loadTracks();
	void syncTrackControlTooltips();
});

onUpdated(() => {
	void syncTrackControlTooltips();
});

onBeforeUnmount(() => {
	isViewMounted = false;
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

		<div v-else class="card shadow-sm border-0 rounded-4 overflow-hidden" data-testid="timeline-editor-card">
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
				</div>
				<div class="d-none" aria-hidden="true">
					<audio
						v-for="track in tracks"
						:key="`sync-${track.id}`"
						:data-testid="`sync-audio-${track.id}`"
						:ref="(element) => setSyncPlayerRef(track.id, element as PlayerLike | null)"
						:src="track.video.url"
						preload="auto"
					/>
				</div>

				<section class="d-flex justify-content-center mb-3">
					<div class="w-100" style="max-width: 28rem;">
						<div class="ratio ratio-16x9 overflow-hidden bg-dark-subtle border">
							<video
								v-if="selectedTrack"
								:data-testid="'selected-video'"
								:key="selectedTrack.id"
								:ref="(element) => setSelectedPreviewRef(element as PlayerLike | null)"
								class="w-100 h-100 object-fit-contain bg-black"
								:src="selectedTrack.video.url"
								muted
								playsinline
								preload="metadata"
							/>
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
						<div class="d-flex align-items-center justify-content-between gap-3">
							<div class="d-inline-flex align-items-center gap-2 flex-wrap">
								<button type="button" class="border-0 bg-transparent p-0 text-body d-inline-flex align-items-center justify-content-center" :title="$t('dashboard.trackEditor.playTitle')" :style="{ lineHeight: '1', minHeight: 'unset', transform: 'none', translate: 'none' }" @click="togglePlayback">
									<i :class="isPlaying ? 'bi bi-pause-fill fs-5' : 'bi bi-play-fill fs-5'" aria-hidden="true"></i>
									<span class="visually-hidden">{{ isPlaying ? $t('dashboard.trackEditor.pauseVisuallyHidden') : $t('dashboard.trackEditor.playVisuallyHidden') }}</span>
								</button>
								<button type="button" class="border-0 bg-transparent p-0 text-body d-inline-flex align-items-center justify-content-center" :title="$t('dashboard.trackEditor.goToStartTitle')" :style="{ lineHeight: '1', minHeight: 'unset', transform: 'none', translate: 'none' }" @click="goToStart">
									<i class="bi bi-skip-start-fill fs-5" aria-hidden="true"></i>
									<span class="visually-hidden">{{ $t('dashboard.trackEditor.goToStartVisuallyHidden') }}</span>
								</button>
								<button type="button" class="border-0 bg-transparent p-0 text-body d-inline-flex align-items-center justify-content-center" :title="$t('dashboard.trackEditor.rewindTitle')" :style="{ lineHeight: '1', minHeight: 'unset', transform: 'none', translate: 'none' }" @click="nudgePlayback(-1)">
									<i class="bi bi-rewind-fill fs-5" aria-hidden="true"></i>
									<span class="visually-hidden">{{ $t('dashboard.trackEditor.rewindVisuallyHidden') }}</span>
								</button>
								<button type="button" class="border-0 bg-transparent p-0 text-body d-inline-flex align-items-center justify-content-center" :title="$t('dashboard.trackEditor.forward')" :style="{ lineHeight: '1', minHeight: 'unset', transform: 'none', translate: 'none' }" @click="nudgePlayback(1)">
									<i class="bi bi-fast-forward-fill fs-5" aria-hidden="true"></i>
									<span class="visually-hidden">{{ $t('dashboard.trackEditor.forward') }}</span>
								</button>
							</div>
							<div class="position-relative">
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
									v-if="isZoomPopoverOpen"
									data-testid="zoom-popover"
									class="border bg-body p-2 shadow-sm"
									:style="{
										position: 'absolute',
										top: 'calc(100% + 0.5rem)',
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
										step="25"
										:value="timelineZoomPercent"
										@input="handleTimelineZoomInput(String(($event.target as HTMLInputElement).value))"
									/>
								</div>
							</div>
						</div>
						<div data-testid="transport-time-row" class="small text-muted">
							<span data-testid="timeline-current">{{ formatTime(currentTimeSec) }}</span>
							 /
							<span data-testid="timeline-duration">{{ formatTime(timelineDurationSec) }}</span>
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
						<template v-for="track in tracks" :key="track.id">
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
										:style="{ minHeight: 'unset' }"
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
								<div class="d-flex align-items-start justify-content-between gap-2">
									<label class="d-grid gap-1 small text-muted fw-semibold flex-grow-1">
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
									<div class="d-flex align-items-center gap-1 flex-shrink-0 mt-4">
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
										<button
											type="button"
											:data-testid="`track-mute-toggle-${track.id}`"
											:ref="(element) => setTrackControlTooltipTarget(`mute-${track.id}`, element)"
											:class="getTrackToggleButtonClass(track.isMuted, 'btn-warning')"
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
									</div>
								</div>
								<div
									:data-testid="`track-duration-row-${track.id}`"
									class="small text-muted"
									:style="{ paddingRight: '2rem', minHeight: '1.5rem', marginTop: '0', marginBottom: '0' }"
								>
									<span>{{ $t('dashboard.trackEditor.durationLabel', { duration: formatTime(track.video.duration) }) }}</span>
								</div>
								<span
									v-if="autosaveStatuses[track.id]"
									:data-testid="`track-autosave-overlay-${track.id}`"
									class="d-inline-flex align-items-center justify-content-end"
									:style="{
										position: 'absolute',
										right: '1rem',
										bottom: '1rem',
										minWidth: '1.5rem',
										minHeight: '1.5rem',
									}"
								>
									<i
										v-if="[
											AUTOSAVE_STATES.pending,
											AUTOSAVE_STATES.saving,
										].includes(autosaveStatuses[track.id]?.state ?? AUTOSAVE_STATES.idle)"
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
											{{ $t('dashboard.trackEditor.trackStartLabel', { time: formatTime(track.startTimeMs / 1000) }) }}
										</div>
									</div>
								</div>
							</section>
						</template>
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
</style>

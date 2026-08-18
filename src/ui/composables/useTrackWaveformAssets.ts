import { reactive, toRaw } from "vue";
import { computeAudioPeaks } from "../utils/audioPeaks.js";

const PEAKS_PER_SECOND = 20;

export interface TrackWaveformAsset {
	objectUrl: string;
	peaks: Float32Array;
	durationSec: number;
}

export type TrackWaveformState =
	| { status: "loading" }
	| { status: "ready"; asset: TrackWaveformAsset }
	| { status: "error" };

interface AudioContextLike {
	decodeAudioData(arrayBuffer: ArrayBuffer): Promise<{
		numberOfChannels: number;
		duration: number;
		getChannelData(channel: number): Float32Array;
	}>;
}

interface AudioGlobals {
	AudioContext?: new () => AudioContextLike;
	webkitAudioContext?: new () => AudioContextLike;
}

// Module-level so the fetch+decode work is shared across every mount of the editor for
// as long as the tab stays open, instead of re-downloading the same file every visit.
const waveformAssetCache = new Map<string, Promise<TrackWaveformAsset>>();
let sharedAudioContext: AudioContextLike | null = null;

/**
 * Test-only: clears the module-level cache/shared AudioContext so tests that stub the
 * Web Audio API don't leak that state into unrelated tests sharing this module instance.
 */
export function __resetTrackWaveformAssetsForTests(): void {
	waveformAssetCache.clear();
	sharedAudioContext = null;
}

function getAudioContext(): AudioContextLike {
	if (sharedAudioContext) {
		return sharedAudioContext;
	}

	const audioGlobals = globalThis as unknown as AudioGlobals;
	const AudioContextCtor = audioGlobals.AudioContext ?? audioGlobals.webkitAudioContext;
	if (!AudioContextCtor) {
		throw new Error("Web Audio API is not available in this environment");
	}

	sharedAudioContext = new AudioContextCtor();
	return sharedAudioContext;
}

function loadTrackWaveformAsset(url: string): Promise<TrackWaveformAsset> {
	const cached = waveformAssetCache.get(url);
	if (cached) {
		return cached;
	}

	const loadPromise = (async (): Promise<TrackWaveformAsset> => {
		// Resolve the Web Audio API dependency before doing any network work: in
		// environments without it (tests, unsupported browsers) this fails fast
		// without ever fetching the file.
		const audioContext = getAudioContext();

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to download track audio (status ${response.status})`);
		}

		const arrayBuffer = await response.arrayBuffer();
		// Build the Blob from the raw bytes first: decodeAudioData may detach/neuter
		// the ArrayBuffer it's given, so the Blob copy must happen before decoding.
		const objectUrl = URL.createObjectURL(new Blob([arrayBuffer]));
		const decoded = await audioContext.decodeAudioData(arrayBuffer);
		const peaks = computeAudioPeaks(decoded, PEAKS_PER_SECOND);

		return { objectUrl, peaks, durationSec: decoded.duration };
	})();

	waveformAssetCache.set(url, loadPromise);
	loadPromise.catch(() => {
		waveformAssetCache.delete(url);
	});

	return loadPromise;
}

/**
 * Fetches each track's video file once, decodes it for waveform peaks, and exposes an
 * object URL built from the same bytes so the same download can also drive playback
 * (avoiding a second, duplicate download of the file for the native audio element).
 */
export function useTrackWaveformAssets() {
	const states = reactive<Record<string, TrackWaveformState>>({});

	function getState(url: string): TrackWaveformState {
		return states[url] ?? { status: "loading" };
	}

	// Reads without registering a reactive dependency. Use this from imperative call
	// sites that can run during a component's own render/patch (e.g. template `:ref`
	// callbacks) — tracking the read there would make this state's async updates force
	// that component to fully re-render on every settle.
	function getRawState(url: string): TrackWaveformState {
		return toRaw(states)[url] ?? { status: "loading" };
	}

	function ensureLoaded(url: string): void {
		if (states[url]) {
			return;
		}

		states[url] = { status: "loading" };
		void loadTrackWaveformAsset(url)
			.then((asset) => {
				states[url] = { status: "ready", asset };
			})
			.catch(() => {
				states[url] = { status: "error" };
			});
	}

	return { states, getState, getRawState, ensureLoaded };
}

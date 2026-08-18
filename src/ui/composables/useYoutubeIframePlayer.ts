import { onBeforeUnmount } from "vue";

const YOUTUBE_API_LOAD_TIMEOUT_MS = 10000;
const YOUTUBE_PLAYER_READY_TIMEOUT_MS = 10000;

export interface YoutubePlayerLike {
	getCurrentTime(): number;
	seekTo(seconds: number, allowSeekAhead: boolean): void;
	isMuted(): boolean;
	mute(): void;
	unMute(): void;
	getVolume(): number;
	setVolume(volume: number): void;
	playVideo(): void;
	pauseVideo(): void;
	destroy(): void;
}

interface YoutubePlayerErrorEvent {
	data: number;
}

interface YoutubeIframeApi {
	Player: new (
		element: string | HTMLElement,
		options: {
			videoId: string;
			playerVars?: Record<string, unknown>;
			events?: {
				onReady?: (event: { target: YoutubePlayerLike }) => void;
				onError?: (event: YoutubePlayerErrorEvent) => void;
			};
		},
	) => YoutubePlayerLike;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;
	const timeoutPromise = new Promise<never>((_resolve, reject) => {
		timeoutId = setTimeout(() => reject(new Error(message)), ms);
	});

	return Promise.race([promise, timeoutPromise]).finally(() => {
		clearTimeout(timeoutId);
	});
}

interface YoutubeGlobals {
	YT?: YoutubeIframeApi;
	onYouTubeIframeAPIReady?: () => void;
}

function getYoutubeGlobals(): YoutubeGlobals {
	return globalThis as unknown as YoutubeGlobals;
}

let youtubeIframeApiPromise: Promise<YoutubeIframeApi> | null = null;

function loadYoutubeIframeApi(): Promise<YoutubeIframeApi> {
	const youtubeGlobals = getYoutubeGlobals();

	if (youtubeGlobals.YT?.Player) {
		return Promise.resolve(youtubeGlobals.YT);
	}

	if (typeof document === "undefined") {
		return Promise.reject(
			new Error("YouTube IFrame API requires a browser environment"),
		);
	}

	if (!youtubeIframeApiPromise) {
		youtubeIframeApiPromise = new Promise((resolve, reject) => {
			const previousReadyCallback = youtubeGlobals.onYouTubeIframeAPIReady;
			youtubeGlobals.onYouTubeIframeAPIReady = () => {
				previousReadyCallback?.();
				resolve(youtubeGlobals.YT as YoutubeIframeApi);
			};

			const script = document.createElement("script");
			script.src = "https://www.youtube.com/iframe_api";
			script.onerror = () => {
				reject(new Error("Failed to load the YouTube IFrame API script"));
			};
			document.head.appendChild(script);
		});
		// A load failure shouldn't poison future attempts forever (e.g. a transient
		// network blip): let the next call start over instead of reusing a dead promise.
		youtubeIframeApiPromise.catch(() => {
			youtubeIframeApiPromise = null;
		});
	}

	return withTimeout(
		youtubeIframeApiPromise,
		YOUTUBE_API_LOAD_TIMEOUT_MS,
		"Timed out loading the YouTube IFrame API",
	);
}

export interface YoutubeSyncPlayer {
	currentTime: number;
	muted: boolean;
	volume: number;
	play: () => void;
	pause: () => void;
}

function createSyncPlayerAdapter(ytPlayer: YoutubePlayerLike): YoutubeSyncPlayer {
	return {
		get currentTime(): number {
			return ytPlayer.getCurrentTime();
		},
		set currentTime(seconds: number) {
			ytPlayer.seekTo(seconds, true);
		},
		get muted(): boolean {
			return ytPlayer.isMuted();
		},
		set muted(shouldMute: boolean) {
			if (shouldMute) {
				ytPlayer.mute();
				return;
			}

			ytPlayer.unMute();
		},
		get volume(): number {
			return ytPlayer.getVolume() / 100;
		},
		set volume(volume: number) {
			ytPlayer.setVolume(Math.round(volume * 100));
		},
		play(): void {
			ytPlayer.playVideo();
		},
		pause(): void {
			ytPlayer.pauseVideo();
		},
	};
}

/**
 * Wraps the YouTube IFrame API so a YouTube video can be driven through the same
 * PlayerLike shape (currentTime/muted/play/pause) used for the native <audio>/<video> tracks.
 */
export function useYoutubeIframePlayer() {
	let ytPlayer: YoutubePlayerLike | null = null;

	async function createYoutubePlayer(
		element: string | HTMLElement,
		videoId: string,
	): Promise<YoutubeSyncPlayer> {
		const youtubeApi = await loadYoutubeIframeApi();
		const playerReadyPromise = new Promise<YoutubeSyncPlayer>((resolve, reject) => {
			ytPlayer = new youtubeApi.Player(element, {
				videoId,
				playerVars: {
					controls: 0,
					disablekb: 1,
				},
				events: {
					onReady: (event) => {
						resolve(createSyncPlayerAdapter(event.target));
					},
					onError: (event) => {
						reject(
							new Error(`YouTube player failed to load the video (error code ${event.data})`),
						);
					},
				},
			});
		});

		return withTimeout(
			playerReadyPromise,
			YOUTUBE_PLAYER_READY_TIMEOUT_MS,
			"Timed out waiting for the YouTube player to become ready",
		);
	}

	function destroyYoutubePlayer(): void {
		ytPlayer?.destroy();
		ytPlayer = null;
	}

	onBeforeUnmount(() => {
		destroyYoutubePlayer();
	});

	return {
		createYoutubePlayer,
		destroyYoutubePlayer,
	};
}

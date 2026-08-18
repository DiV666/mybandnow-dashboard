import { onBeforeUnmount } from "vue";

export interface YoutubePlayerLike {
	getCurrentTime(): number;
	seekTo(seconds: number, allowSeekAhead: boolean): void;
	isMuted(): boolean;
	mute(): void;
	unMute(): void;
	playVideo(): void;
	pauseVideo(): void;
	destroy(): void;
}

interface YoutubeIframeApi {
	Player: new (
		element: string | HTMLElement,
		options: {
			videoId: string;
			playerVars?: Record<string, unknown>;
			events?: {
				onReady?: (event: { target: YoutubePlayerLike }) => void;
			};
		},
	) => YoutubePlayerLike;
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
		youtubeIframeApiPromise = new Promise((resolve) => {
			const previousReadyCallback = youtubeGlobals.onYouTubeIframeAPIReady;
			youtubeGlobals.onYouTubeIframeAPIReady = () => {
				previousReadyCallback?.();
				resolve(youtubeGlobals.YT as YoutubeIframeApi);
			};

			const script = document.createElement("script");
			script.src = "https://www.youtube.com/iframe_api";
			document.head.appendChild(script);
		});
	}

	return youtubeIframeApiPromise;
}

export interface YoutubeSyncPlayer {
	currentTime: number;
	muted: boolean;
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
		return new Promise((resolve) => {
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
				},
			});
		});
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

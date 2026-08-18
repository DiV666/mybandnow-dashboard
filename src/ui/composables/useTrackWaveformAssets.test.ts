import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { useTrackWaveformAssets as UseTrackWaveformAssets } from "./useTrackWaveformAssets.js";

const decodeAudioDataMock = vi.fn();
const audioContextCtorMock = vi.fn(function FakeAudioContext(this: {
	decodeAudioData: typeof decodeAudioDataMock;
}) {
	this.decodeAudioData = decodeAudioDataMock;
});
const createObjectURLMock = vi.fn(() => "blob:mock-object-url");
const fetchMock = vi.fn();

function fakeDecodedAudioBuffer(durationSec: number) {
	return {
		numberOfChannels: 1,
		duration: durationSec,
		getChannelData: () => Float32Array.from([0.1, 0.9, 0.2]),
	};
}

// The module keeps a private module-level cache (by design, so a track's audio is only
// downloaded once per tab session). Re-importing it fresh per test keeps that cache from
// leaking between otherwise-independent tests.
async function loadFreshComposable(): Promise<typeof UseTrackWaveformAssets> {
	vi.resetModules();
	const module = await import("./useTrackWaveformAssets.js");
	return module.useTrackWaveformAssets;
}

describe("useTrackWaveformAssets", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		decodeAudioDataMock.mockReset();
		audioContextCtorMock.mockClear();
		createObjectURLMock.mockClear();
		fetchMock.mockReset();

		vi.stubGlobal("AudioContext", audioContextCtorMock);
		// Patch the real URL constructor instead of replacing the global: Node's own
		// module loader depends on `URL` staying a real constructor during `import()`.
		URL.createObjectURL = createObjectURLMock;
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		Reflect.deleteProperty(URL, "createObjectURL");
	});

	it("starts in the loading state until ensureLoaded resolves", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			arrayBuffer: async () => new ArrayBuffer(8),
		});
		decodeAudioDataMock.mockResolvedValue(fakeDecodedAudioBuffer(2));

		const useTrackWaveformAssets = await loadFreshComposable();
		const { getState, ensureLoaded } = useTrackWaveformAssets();

		expect(getState("https://cdn.example/a.mp4")).toEqual({ status: "loading" });
		ensureLoaded("https://cdn.example/a.mp4");
		expect(getState("https://cdn.example/a.mp4")).toEqual({ status: "loading" });

		await vi.waitFor(() =>
			expect(getState("https://cdn.example/a.mp4").status).toBe("ready"),
		);

		const state = getState("https://cdn.example/a.mp4");
		if (state.status !== "ready") {
			throw new Error("Expected ready state");
		}
		expect(state.asset.objectUrl).toBe("blob:mock-object-url");
		expect(state.asset.durationSec).toBe(2);
		expect(state.asset.peaks.length).toBeGreaterThan(0);
		expect(fetchMock).toHaveBeenCalledWith("https://cdn.example/a.mp4");
	});

	it("only fetches a given url once across multiple ensureLoaded calls/instances", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			arrayBuffer: async () => new ArrayBuffer(8),
		});
		decodeAudioDataMock.mockResolvedValue(fakeDecodedAudioBuffer(1));

		const useTrackWaveformAssets = await loadFreshComposable();
		const first = useTrackWaveformAssets();
		first.ensureLoaded("https://cdn.example/shared.mp4");
		await vi.waitFor(() =>
			expect(first.getState("https://cdn.example/shared.mp4").status).toBe("ready"),
		);

		const second = useTrackWaveformAssets();
		second.ensureLoaded("https://cdn.example/shared.mp4");
		await vi.waitFor(() =>
			expect(second.getState("https://cdn.example/shared.mp4").status).toBe("ready"),
		);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("does not fetch at all when the Web Audio API is unavailable", async () => {
		vi.stubGlobal("AudioContext", undefined);
		vi.stubGlobal("webkitAudioContext", undefined);

		const useTrackWaveformAssets = await loadFreshComposable();
		const { getState, ensureLoaded } = useTrackWaveformAssets();
		ensureLoaded("https://cdn.example/no-audio-api.mp4");

		await vi.waitFor(() =>
			expect(getState("https://cdn.example/no-audio-api.mp4").status).toBe("error"),
		);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("marks the track as error when the download fails, without throwing", async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 500 });

		const useTrackWaveformAssets = await loadFreshComposable();
		const { getState, ensureLoaded } = useTrackWaveformAssets();
		ensureLoaded("https://cdn.example/broken.mp4");

		await vi.waitFor(() =>
			expect(getState("https://cdn.example/broken.mp4").status).toBe("error"),
		);
	});

	it("getRawState reflects the same value as getState without registering a reactive dependency", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			arrayBuffer: async () => new ArrayBuffer(8),
		});
		decodeAudioDataMock.mockResolvedValue(fakeDecodedAudioBuffer(2));

		const useTrackWaveformAssets = await loadFreshComposable();
		const { getState, getRawState, ensureLoaded } = useTrackWaveformAssets();
		const url = "https://cdn.example/raw-read.mp4";

		expect(getRawState(url)).toEqual({ status: "loading" });

		const { effect } = await import("vue");
		const trackedReads: unknown[] = [];
		const stop = effect(() => {
			trackedReads.push(getRawState(url).status);
		});

		ensureLoaded(url);
		await vi.waitFor(() => expect(getState(url).status).toBe("ready"));

		// A tracked effect only re-runs when a reactive dependency it read changes;
		// getRawState must not trigger that even though the underlying value changed.
		expect(trackedReads).toEqual(["loading"]);
		expect(getRawState(url)).toEqual(getState(url));

		stop.effect.stop();
	});
});

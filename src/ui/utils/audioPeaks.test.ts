import { describe, expect, it } from "vitest";
import {
	computeAudioPeaks,
	resamplePeaksToWidth,
	type DecodedAudioLike,
} from "./audioPeaks.js";

function makeAudioBuffer(
	channelSamples: number[][],
	sampleRate: number,
): DecodedAudioLike {
	return {
		numberOfChannels: channelSamples.length,
		duration: (channelSamples[0]?.length ?? 0) / sampleRate,
		getChannelData: (channel: number) => Float32Array.from(channelSamples[channel] ?? []),
	};
}

describe("computeAudioPeaks", () => {
	it("produces one peak per bucket at the requested resolution", () => {
		const samples = new Array(10).fill(0).map((_, index) => (index % 2 === 0 ? 1 : -1));
		const audioBuffer = makeAudioBuffer([samples], 10);

		const peaks = computeAudioPeaks(audioBuffer, 2);

		expect(peaks.length).toBe(2);
	});

	it("captures the max absolute amplitude within each bucket", () => {
		const samples = [0.1, 0.2, -0.9, 0.05, 0.3, 0.4, -0.2, 0.1];
		const audioBuffer = makeAudioBuffer([samples], 8);

		const peaks = computeAudioPeaks(audioBuffer, 2);

		expect(peaks[0]).toBeCloseTo(0.9);
		expect(peaks[1]).toBeCloseTo(0.4);
	});

	it("averages channels before taking the peak amplitude", () => {
		const left = [1, 1];
		const right = [-1, 0];
		const audioBuffer = makeAudioBuffer([left, right], 2);

		const peaks = computeAudioPeaks(audioBuffer, 1);

		expect(peaks[0]).toBeCloseTo(0.5);
	});

	it("returns silence for an empty buffer", () => {
		const audioBuffer = makeAudioBuffer([[]], 1);

		const peaks = computeAudioPeaks(audioBuffer, 5);

		expect(Array.from(peaks)).toEqual([0]);
	});
});

describe("resamplePeaksToWidth", () => {
	it("returns the same array when the target is not smaller", () => {
		const peaks = Float32Array.from([0.1, 0.2, 0.3]);

		expect(resamplePeaksToWidth(peaks, 5)).toBe(peaks);
	});

	it("downsamples by taking the max amplitude per bucket", () => {
		const peaks = Float32Array.from([0.1, 0.9, 0.2, 0.1, 0.3, 0.05]);

		const resampled = resamplePeaksToWidth(peaks, 3);

		expect(resampled[0]).toBeCloseTo(0.9);
		expect(resampled[1]).toBeCloseTo(0.2);
		expect(resampled[2]).toBeCloseTo(0.3);
	});

	it("returns an empty array for a zero target width", () => {
		const peaks = Float32Array.from([0.1, 0.2]);

		expect(resamplePeaksToWidth(peaks, 0)).toHaveLength(0);
	});

	it("returns an empty array when there are no peaks to resample", () => {
		expect(resamplePeaksToWidth(new Float32Array(0), 10)).toHaveLength(0);
	});
});

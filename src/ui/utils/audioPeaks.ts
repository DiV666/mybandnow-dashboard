export interface DecodedAudioLike {
	readonly numberOfChannels: number;
	readonly duration: number;
	getChannelData(channel: number): Float32Array;
}

/**
 * Downmixes to mono and reduces the decoded samples to one max-amplitude peak per bucket,
 * at a fixed resolution independent of zoom so the result can be cached and resampled later.
 */
export function computeAudioPeaks(
	audioBuffer: DecodedAudioLike,
	peaksPerSecond: number,
): Float32Array {
	const totalPeaks = Math.max(1, Math.ceil(audioBuffer.duration * peaksPerSecond));
	const channelCount = Math.max(1, audioBuffer.numberOfChannels);
	const channels: Float32Array[] = [];
	for (let channel = 0; channel < channelCount; channel += 1) {
		channels.push(audioBuffer.getChannelData(channel));
	}

	const sampleCount = channels[0]?.length ?? 0;
	if (sampleCount === 0) {
		return new Float32Array(totalPeaks);
	}

	const samplesPerPeak = Math.max(1, Math.floor(sampleCount / totalPeaks));
	const peaks = new Float32Array(totalPeaks);

	for (let peakIndex = 0; peakIndex < totalPeaks; peakIndex += 1) {
		const start = peakIndex * samplesPerPeak;
		const end = Math.min(sampleCount, start + samplesPerPeak);
		let max = 0;
		for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
			let sum = 0;
			for (const channel of channels) {
				sum += channel[sampleIndex] ?? 0;
			}
			const amplitude = Math.abs(sum / channels.length);
			if (amplitude > max) {
				max = amplitude;
			}
		}
		peaks[peakIndex] = max;
	}

	return peaks;
}

/**
 * Reduces a fine-grained peaks array down to one max-amplitude value per target bucket, so a
 * single decoded/cached peaks array can be redrawn at any canvas width (e.g. after a zoom change).
 */
export function resamplePeaksToWidth(
	peaks: Float32Array,
	targetBucketCount: number,
): Float32Array {
	if (targetBucketCount <= 0 || peaks.length === 0) {
		return new Float32Array(0);
	}

	if (targetBucketCount >= peaks.length) {
		return peaks;
	}

	const resampled = new Float32Array(targetBucketCount);
	const samplesPerBucket = peaks.length / targetBucketCount;

	for (let bucketIndex = 0; bucketIndex < targetBucketCount; bucketIndex += 1) {
		const start = Math.floor(bucketIndex * samplesPerBucket);
		const end = Math.max(start + 1, Math.floor((bucketIndex + 1) * samplesPerBucket));
		let max = 0;
		for (
			let sampleIndex = start;
			sampleIndex < end && sampleIndex < peaks.length;
			sampleIndex += 1
		) {
			if (peaks[sampleIndex] > max) {
				max = peaks[sampleIndex];
			}
		}
		resampled[bucketIndex] = max;
	}

	return resampled;
}

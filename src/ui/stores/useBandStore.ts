import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Band } from "../../domain/band/Band.js";
import { browserSessionStorage } from "../../infrastructure/storage/browserSessionStorage.js";

export const useBandStore = defineStore("band", () => {
	const bands = ref<Band[]>([]);
	const selectedBandId = ref<string | null>(
		browserSessionStorage.getSelectedBandId(),
	);
	const isLoaded = ref(false);

	const selectedBand = computed(() => {
		if (!selectedBandId.value) return null;
		return bands.value.find((b) => b.id.value === selectedBandId.value) || null;
	});

	const hasBands = computed(() => bands.value.length > 0);

	function setBands(newBands: Band[]) {
		bands.value = newBands;
		isLoaded.value = true;

		// Select a valid band when none is selected or the previous selection disappeared.
		if (newBands.length > 0) {
			if (
				!selectedBandId.value ||
				!newBands.some((b) => b.id.value === selectedBandId.value)
			) {
				selectBand(newBands[0].id.value);
			}
		} else {
			selectedBandId.value = null;
			browserSessionStorage.clearSelectedBandId();
		}
	}

	function selectBand(bandId: string) {
		selectedBandId.value = bandId;
		browserSessionStorage.setSelectedBandId(bandId);
	}

	function clear() {
		bands.value = [];
		selectedBandId.value = null;
		isLoaded.value = false;
		browserSessionStorage.clearSelectedBandId();
	}

	return {
		bands,
		selectedBandId,
		selectedBand,
		hasBands,
		isLoaded,
		setBands,
		selectBand,
		clear,
	};
});

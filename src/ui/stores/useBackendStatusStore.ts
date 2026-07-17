import { defineStore } from "pinia";
import { ref } from "vue";

export const useBackendStatusStore = defineStore("backendStatus", () => {
	const isBackendUnavailable = ref(false);

	function markUnavailable(): void {
		isBackendUnavailable.value = true;
	}

	function clear(): void {
		isBackendUnavailable.value = false;
	}

	return {
		isBackendUnavailable,
		markUnavailable,
		clear,
	};
});

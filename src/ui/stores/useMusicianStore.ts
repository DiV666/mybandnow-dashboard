import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { MusicianPrimitives } from "../../application/musician/GetMyProfileUseCase.js";
import { container } from "../bootstrap/container.js";

export const useMusicianStore = defineStore("musician", () => {
	const profile = ref<MusicianPrimitives | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const { getMyProfileUseCase, createProfileUseCase } = container.useCases;

	const hasProfile = computed(() => profile.value !== null);

	const isProfileCompletionPending = ref(false);
	let profileCompletionResolver: (() => void) | null = null;

	const getErrorMessage = (error: unknown, fallback: string): string => {
		console.error(error);
		return fallback;
	};

	const fetchProfile = async (options?: { throwOnError?: boolean }) => {
		isLoading.value = true;
		error.value = null;
		try {
			const musician = await getMyProfileUseCase.run();
			if (musician) {
				profile.value = musician.toPrimitives();
			} else {
				profile.value = null;
			}
		} catch (err: unknown) {
			error.value = getErrorMessage(err, "Error fetching profile");
			if (options?.throwOnError) {
				throw err;
			}
		} finally {
			isLoading.value = false;
		}
	};

	const requireProfileCompletion = (): Promise<void> => {
		return new Promise((resolve) => {
			isProfileCompletionPending.value = true;
			profileCompletionResolver = resolve;
		});
	};

	const createProfile = async (name: string, username: string) => {
		isLoading.value = true;
		error.value = null;
		try {
			await createProfileUseCase.run(name, username);
			// Fetch it again to get the generated IDs
			await fetchProfile({ throwOnError: true });

			if (!profile.value) {
				throw new Error("Profile not available after creation");
			}

			isProfileCompletionPending.value = false;
			if (profileCompletionResolver) {
				profileCompletionResolver();
				profileCompletionResolver = null;
			}
		} catch (err: unknown) {
			error.value = getErrorMessage(err, "Error creating profile");
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const clear = () => {
		profile.value = null;
		error.value = null;
	};

	return {
		profile,
		hasProfile,
		isProfileCompletionPending,
		isLoading,
		error,
		fetchProfile,
		requireProfileCompletion,
		createProfile,
		clear,
	};
});

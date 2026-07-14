import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const createProfileRun =
	vi.fn<(name: string, username: string) => Promise<void>>();
const getMyProfileRun =
	vi.fn<
		() => Promise<{
			toPrimitives: () => {
				id: string;
				userId: string;
				username: string;
				name: string;
			};
		} | null>
	>();

vi.mock("../../infrastructure/musician/AxiosMusicianRepository.js", () => ({
	AxiosMusicianRepository: class AxiosMusicianRepository {},
}));

vi.mock("../../application/musician/CreateProfileUseCase.js", () => ({
	CreateProfileUseCase: class CreateProfileUseCase {
		run(name: string, username: string): Promise<void> {
			return createProfileRun(name, username);
		}
	},
}));

vi.mock("../../application/musician/GetMyProfileUseCase.js", () => ({
	GetMyProfileUseCase: class GetMyProfileUseCase {
		run() {
			return getMyProfileRun();
		}
	},
}));

import { useMusicianStore } from "./useMusicianStore.js";

describe("useMusicianStore", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		createProfileRun.mockReset();
		getMyProfileRun.mockReset();
	});

	it("keeps profile completion pending when the profile refetch fails after creation", async () => {
		const store = useMusicianStore();
		const completionPromise = store.requireProfileCompletion();
		let resolved = false;
		completionPromise.then(() => {
			resolved = true;
		});

		createProfileRun.mockResolvedValue(undefined);
		getMyProfileRun.mockRejectedValue(new Error("Error fetching profile"));

		await expect(
			store.createProfile("Jimi Hendrix", "jimi_hendrix"),
		).rejects.toThrow("Error fetching profile");

		expect(store.isProfileCompletionPending).toBe(true);
		expect(resolved).toBe(false);
	});

	it("keeps profile completion pending when the refetch succeeds but still returns no profile", async () => {
		const store = useMusicianStore();
		const completionPromise = store.requireProfileCompletion();
		let resolved = false;
		completionPromise.then(() => {
			resolved = true;
		});

		createProfileRun.mockResolvedValue(undefined);
		getMyProfileRun.mockResolvedValue(null);

		await expect(
			store.createProfile("Jimi Hendrix", "jimi_hendrix"),
		).rejects.toThrow("Profile not available after creation");

		expect(store.isProfileCompletionPending).toBe(true);
		expect(resolved).toBe(false);
	});

	it("resolves profile completion after the refetch hydrates the created profile", async () => {
		const store = useMusicianStore();
		const completionPromise = store.requireProfileCompletion();

		createProfileRun.mockResolvedValue(undefined);
		getMyProfileRun.mockResolvedValue({
			toPrimitives: () => ({
				id: "11111111-1111-4111-8111-111111111111",
				userId: "22222222-2222-4222-8222-222222222222",
				username: "jimi_hendrix",
				name: "Jimi Hendrix",
			}),
		});

		await expect(
			store.createProfile("Jimi Hendrix", "jimi_hendrix"),
		).resolves.toBeUndefined();
		await expect(completionPromise).resolves.toBeUndefined();

		expect(store.isProfileCompletionPending).toBe(false);
		expect(store.profile).toEqual({
			id: "11111111-1111-4111-8111-111111111111",
			userId: "22222222-2222-4222-8222-222222222222",
			username: "jimi_hendrix",
			name: "Jimi Hendrix",
		});
	});
});

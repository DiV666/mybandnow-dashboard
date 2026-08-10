import { beforeEach, describe, expect, it } from "vitest";
import { mock, mockReset } from "vitest-mock-extended";
import { useMusicianDisplayNames } from "./useMusicianDisplayNames.js";
import { GetMusicianByIdUseCase } from "../../application/musician/GetMusicianByIdUseCase.js";
import type { MusicianSummaryResponse } from "../../domain/musician/MusicianSummaryResponse.js";

describe("useMusicianDisplayNames", () => {
	const getMusicianByIdUseCase = mock<GetMusicianByIdUseCase>();

	beforeEach(() => {
		mockReset(getMusicianByIdUseCase);
	});

	function createComposable() {
		return useMusicianDisplayNames({ getMusicianByIdUseCase });
	}

	function musician(overrides: Partial<MusicianSummaryResponse> = {}): MusicianSummaryResponse {
		return {
			id: "musician-1",
			name: "Jane Doe",
			username: "janedoe",
			...overrides,
		} as MusicianSummaryResponse;
	}

	it("loads and resolves the musician display name", async () => {
		getMusicianByIdUseCase.run.mockResolvedValue(musician());

		const { musicianDisplayNames, ensureMusicianDisplayNameLoaded } = createComposable();
		await ensureMusicianDisplayNameLoaded("musician-1");

		expect(musicianDisplayNames.value["musician-1"]).toBe("Jane Doe");
	});

	it("deduplicates concurrent calls to ensureMusicianDisplayNameLoaded for the same musician", async () => {
		let resolveRun: (value: MusicianSummaryResponse | null) => void = () => {};
		getMusicianByIdUseCase.run.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRun = resolve;
				}),
		);

		const { ensureMusicianDisplayNameLoaded } = createComposable();
		const first = ensureMusicianDisplayNameLoaded("musician-1");
		const second = ensureMusicianDisplayNameLoaded("musician-1");

		resolveRun(musician());
		await Promise.all([first, second]);

		expect(getMusicianByIdUseCase.run).toHaveBeenCalledTimes(1);
	});

	it("does not re-fetch once the display name is already cached", async () => {
		getMusicianByIdUseCase.run.mockResolvedValue(musician());

		const { ensureMusicianDisplayNameLoaded } = createComposable();
		await ensureMusicianDisplayNameLoaded("musician-1");
		await ensureMusicianDisplayNameLoaded("musician-1");

		expect(getMusicianByIdUseCase.run).toHaveBeenCalledTimes(1);
	});

	it("falls back to the username when the musician name is empty", () => {
		const { resolveMusicianDisplayName } = createComposable();

		expect(resolveMusicianDisplayName("", "janedoe")).toBe("@janedoe");
	});

	it("returns an empty string when both name and username are empty", () => {
		const { resolveMusicianDisplayName } = createComposable();

		expect(resolveMusicianDisplayName("", "")).toBe("");
	});

	it("does not cache a display name when the musician lookup resolves to null", async () => {
		getMusicianByIdUseCase.run.mockResolvedValue(null);

		const { musicianDisplayNames, ensureMusicianDisplayNameLoaded } = createComposable();
		await ensureMusicianDisplayNameLoaded("musician-1");

		expect(musicianDisplayNames.value["musician-1"]).toBeUndefined();
	});

	it("preloads display names for every unique musician id in the given instruments", async () => {
		getMusicianByIdUseCase.run.mockImplementation((id: string) =>
			Promise.resolve(musician({ id, name: `Musician ${id}` })),
		);

		const { musicianDisplayNames, preloadMusicianDisplayNames } = createComposable();
		await preloadMusicianDisplayNames([
			{ musicianId: "musician-1" } as never,
			{ musicianId: "musician-2" } as never,
			{ musicianId: "musician-1" } as never,
			{ musicianId: "" } as never,
		]);

		expect(getMusicianByIdUseCase.run).toHaveBeenCalledTimes(2);
		expect(musicianDisplayNames.value["musician-1"]).toBe("Musician musician-1");
		expect(musicianDisplayNames.value["musician-2"]).toBe("Musician musician-2");
	});
});

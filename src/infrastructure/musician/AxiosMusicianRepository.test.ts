import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosMusicianRepository } from "./AxiosMusicianRepository.js";
import { httpClient } from "../http/httpClient.js";
import { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import { MusicianName } from "../../domain/musician/value-object/MusicianName.js";
import { MusicianUsername } from "../../domain/musician/value-object/MusicianUsername.js";

describe("AxiosMusicianRepository", () => {
	const repository = new AxiosMusicianRepository();

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should send the id, name, and username when creating a profile", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined } as never);

		await repository.createProfile(
			new MusicianId("11111111-1111-4111-8111-111111111111"),
			new MusicianName("Jimi Hendrix"),
			new MusicianUsername("jimi_hendrix"),
		);

		expect(postSpy).toHaveBeenCalledWith("/v1/profile", {
			id: "11111111-1111-4111-8111-111111111111",
			name: "Jimi Hendrix",
			username: "jimi_hendrix",
		});
	});

	it("should return the musician public data by id", async () => {
		vi.spyOn(httpClient, "get").mockResolvedValue({
			data: {
				id: "musician-1",
				name: "Jimi Hendrix",
				username: "jimi_hendrix",
			},
		});

		const musician = await repository.getById("musician-1");

		expect(httpClient.get).toHaveBeenCalledWith("/v1/musicians/musician-1");
		expect(musician).toEqual({
			id: "musician-1",
			name: "Jimi Hendrix",
			username: "jimi_hendrix",
		});
	});

	it("should return null when the musician public data is not found", async () => {
		vi.spyOn(httpClient, "get").mockRejectedValue({
			response: { status: 404 },
		});

		const musician = await repository.getById("missing-musician");

		expect(musician).toBeNull();
	});

	it("should return null when the private profile is not found", async () => {
		vi.spyOn(httpClient, "get").mockRejectedValue({
			response: { status: 404 },
		});

		const profile = await repository.getProfile();

		expect(profile).toBeNull();
	});
});

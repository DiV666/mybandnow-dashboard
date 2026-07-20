import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosBandRepository } from "./AxiosBandRepository.js";
import { httpClient } from "../http/httpClient.js";
import { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";

describe("AxiosBandRepository", () => {
	const repository = new AxiosBandRepository();

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return null when the band is not found", async () => {
		vi.spyOn(httpClient, "get").mockRejectedValue({
			response: { status: 404 },
		});

		const band = await repository.getById("band-id");

		expect(band).toBeNull();
	});

	it("should return the band members of the selected band", async () => {
		vi.spyOn(httpClient, "get").mockResolvedValue({
			data: {
				items: [
					{ musicianId: "musician-1", role: "ADMIN" },
					{ musicianId: "musician-2", role: "MEMBER" },
				],
				total: 2,
			},
		});

		const members = await repository.getMembers("band-123");

		expect(httpClient.get).toHaveBeenCalledWith("/v1/bands/band-123/members");
		expect(members).toEqual([
			{ musicianId: "musician-1", role: "ADMIN" },
			{ musicianId: "musician-2", role: "MEMBER" },
		]);
	});

	it("should post the musician email to add a band member", async () => {
		const postSpy = vi
			.spyOn(httpClient, "post")
			.mockResolvedValue({ data: undefined });

		await repository.addMember(
			"band-123",
			new MusicianEmail("artist@example.com"),
		);

		expect(postSpy).toHaveBeenCalledWith("/v1/bands/band-123/members", {
			musicianEmail: "artist@example.com",
		});
	});
});

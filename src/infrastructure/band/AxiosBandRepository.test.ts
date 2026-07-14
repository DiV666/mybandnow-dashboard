import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosBandRepository } from "./AxiosBandRepository.js";
import { httpClient } from "../http/httpClient.js";

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
});

import type { BandRepository } from "../../domain/band/repository/BandRepository.js";
import { Band, type BandPrimitives } from "../../domain/band/Band.js";
import { httpClient } from "../http/httpClient.js";

function hasResponseStatus(
	error: unknown,
	status: number,
): error is { response: { status: number } } {
	if (typeof error !== "object" || error === null || !("response" in error)) {
		return false;
	}

	const { response } = error;
	if (
		typeof response !== "object" ||
		response === null ||
		!("status" in response)
	) {
		return false;
	}

	return response.status === status;
}

export class AxiosBandRepository implements BandRepository {
	async getAll(): Promise<Band[]> {
		const response = await httpClient.get<{
			items: BandPrimitives[];
			total: number;
		}>("/v1/bands");
		return response.data.items.map(Band.fromPrimitives);
	}

	async getById(id: string): Promise<Band | null> {
		try {
			const response = await httpClient.get<BandPrimitives>(`/v1/bands/${id}`);
			return Band.fromPrimitives(response.data);
		} catch (error: unknown) {
			if (hasResponseStatus(error, 404)) return null;
			throw error;
		}
	}

	async save(band: Band): Promise<void> {
		const primitives = band.toPrimitives();
		await httpClient.post("/v1/bands", primitives);
	}
}

import type { BandRepository } from "../../domain/band/repository/BandRepository.js";
import { Band, type BandPrimitives } from "../../domain/band/Band.js";
import type {
	BandMemberCollectionResponse,
	BandMemberResponse,
} from "../../domain/band/BandMemberResponse.js";
import type { MusicianEmail } from "../../domain/musician/value-object/MusicianEmail.js";
import { httpClient } from "../http/httpClient.js";
import { hasResponseStatus } from "../http/httpErrorStatus.js";

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

	async getMembers(bandId: string): Promise<BandMemberResponse[]> {
		const response = await httpClient.get<BandMemberCollectionResponse>(
			`/v1/bands/${bandId}/members`,
		);
		return response.data.items;
	}

	async save(band: Band): Promise<void> {
		const primitives = band.toPrimitives();
		await httpClient.post("/v1/bands", primitives);
	}

	async addMember(bandId: string, musicianEmail: MusicianEmail): Promise<void> {
		await httpClient.post(`/v1/bands/${bandId}/members`, {
			musicianEmail: musicianEmail.value,
		});
	}

	async removeMember(bandId: string, musicianId: string): Promise<void> {
		await httpClient.delete(`/v1/bands/${bandId}/members/${musicianId}`);
	}
}

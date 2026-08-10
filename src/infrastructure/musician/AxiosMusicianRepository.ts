import { httpClient } from "../http/httpClient.js";
import {
	Musician,
	type MusicianPrimitives,
} from "../../domain/musician/Musician.js";
import type { MusicianSummaryResponse } from "../../domain/musician/MusicianSummaryResponse.js";
import type { MusicianRepository } from "../../domain/musician/repository/MusicianRepository.js";
import type { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import type { MusicianName } from "../../domain/musician/value-object/MusicianName.js";
import type { MusicianUsername } from "../../domain/musician/value-object/MusicianUsername.js";
import { hasResponseStatus } from "../http/httpErrorStatus.js";

export class AxiosMusicianRepository implements MusicianRepository {
	async getProfile(): Promise<Musician | null> {
		try {
			const response = await httpClient.get<MusicianPrimitives>("/v1/profile");
			return Musician.fromPrimitives(response.data);
		} catch (error: unknown) {
			if (hasResponseStatus(error, 404)) {
				return null;
			}
			throw error;
		}
	}

	async getById(id: string): Promise<MusicianSummaryResponse | null> {
		try {
			const response = await httpClient.get<MusicianSummaryResponse>(
				`/v1/musicians/${id}`,
			);
			return response.data;
		} catch (error: unknown) {
			if (hasResponseStatus(error, 404)) {
				return null;
			}
			throw error;
		}
	}

	async createProfile(
		id: MusicianId,
		name: MusicianName,
		username: MusicianUsername,
	): Promise<void> {
		await httpClient.post("/v1/profile", {
			id: id.value,
			name: name.value,
			username: username.value,
		});
	}
}

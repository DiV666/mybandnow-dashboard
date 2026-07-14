import { httpClient } from "../http/httpClient.js";
import {
	Musician,
	type MusicianPrimitives,
} from "../../domain/musician/Musician.js";
import type { MusicianRepository } from "../../domain/musician/repository/MusicianRepository.js";
import type { MusicianId } from "../../domain/musician/value-object/MusicianId.js";
import type { MusicianName } from "../../domain/musician/value-object/MusicianName.js";
import type { MusicianUsername } from "../../domain/musician/value-object/MusicianUsername.js";

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

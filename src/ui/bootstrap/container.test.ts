import { describe, expect, it } from "vitest";
import { container } from "./container.js";
import { AxiosAuthRepository } from "../../infrastructure/auth/AxiosAuthRepository.js";
import { AxiosBandRepository } from "../../infrastructure/band/AxiosBandRepository.js";
import { AxiosInstrumentRepository } from "../../infrastructure/instrument/AxiosInstrumentRepository.js";
import { AxiosMusicianRepository } from "../../infrastructure/musician/AxiosMusicianRepository.js";
import { AxiosSongRepository } from "../../infrastructure/song/AxiosSongRepository.js";
import { LoginUseCase } from "../../application/auth/LoginUseCase.js";
import { CreateBandUseCase } from "../../application/band/CreateBandUseCase.js";
import { GetMyProfileUseCase } from "../../application/musician/GetMyProfileUseCase.js";
import { GetInstrumentsUseCase } from "../../application/instrument/GetInstrumentsUseCase.js";
import { CreateSongUseCase } from "../../application/song/CreateSongUseCase.js";

function injectedRepository(useCase: object): unknown {
	const candidate = useCase as unknown as { repository?: unknown; authRepository?: unknown };
	return candidate.repository ?? candidate.authRepository;
}

describe("container", () => {
	it("instantiates one repository per bounded context", () => {
		expect(container.repositories.authRepository).toBeInstanceOf(AxiosAuthRepository);
		expect(container.repositories.bandRepository).toBeInstanceOf(AxiosBandRepository);
		expect(container.repositories.instrumentRepository).toBeInstanceOf(
			AxiosInstrumentRepository,
		);
		expect(container.repositories.musicianRepository).toBeInstanceOf(AxiosMusicianRepository);
		expect(container.repositories.songRepository).toBeInstanceOf(AxiosSongRepository);
	});

	it("exposes the same repository instance on every access (module-level singleton)", () => {
		expect(container.repositories.bandRepository).toBe(container.repositories.bandRepository);
		expect(container.repositories.songRepository).toBe(container.repositories.songRepository);
	});

	it("wires each use case to the repository of its own bounded context", () => {
		expect(container.useCases.loginUseCase).toBeInstanceOf(LoginUseCase);
		expect(injectedRepository(container.useCases.loginUseCase)).toBe(
			container.repositories.authRepository,
		);

		expect(container.useCases.createBandUseCase).toBeInstanceOf(CreateBandUseCase);
		expect(injectedRepository(container.useCases.createBandUseCase)).toBe(
			container.repositories.bandRepository,
		);

		expect(container.useCases.getMyProfileUseCase).toBeInstanceOf(GetMyProfileUseCase);
		expect(injectedRepository(container.useCases.getMyProfileUseCase)).toBe(
			container.repositories.musicianRepository,
		);

		expect(container.useCases.getInstrumentsUseCase).toBeInstanceOf(GetInstrumentsUseCase);
		expect(injectedRepository(container.useCases.getInstrumentsUseCase)).toBe(
			container.repositories.instrumentRepository,
		);

		expect(container.useCases.createSongUseCase).toBeInstanceOf(CreateSongUseCase);
		expect(injectedRepository(container.useCases.createSongUseCase)).toBe(
			container.repositories.songRepository,
		);
	});

	it("shares a single song repository instance across every song use case", () => {
		const songUseCaseKeys = [
			"assignSongInstrumentMusicianUseCase",
			"createSongInstrumentUseCase",
			"createSongUseCase",
			"getBandSongsUseCase",
			"getSongInstrumentDetailUseCase",
			"getSongInstrumentsUseCase",
			"inviteSongInstrumentMusicianUseCase",
			"updateSongInstrumentUseCase",
			"updateSongInstrumentVideoStartTimeUseCase",
			"uploadSongInstrumentVideoUseCase",
		] as const;

		for (const key of songUseCaseKeys) {
			expect(injectedRepository(container.useCases[key])).toBe(
				container.repositories.songRepository,
			);
		}
	});
});

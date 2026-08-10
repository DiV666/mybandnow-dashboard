import { describe, it, expect, beforeEach } from 'vitest';
import { mock, mockReset } from 'vitest-mock-extended';
import { CreateBandUseCase } from './CreateBandUseCase.js';
import type { BandRepository } from '../../domain/band/repository/BandRepository.js';

describe('CreateBandUseCase', () => {
	const repositoryMock = mock<BandRepository>();
	let useCase: CreateBandUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new CreateBandUseCase(repositoryMock);
	});

	it('should create a band using the repository', async () => {
		const bandId = '123e4567-e89b-12d3-a456-426614174000';
		const bandName = 'The Rolling Stones';

		await useCase.run(bandId, bandName);

		expect(repositoryMock.save).toHaveBeenCalledTimes(1);
		const savedBand = repositoryMock.save.mock.calls[0][0];
		
		expect(savedBand.id.value).toBe(bandId);
		expect(savedBand.name.value).toBe(bandName);
	});
});

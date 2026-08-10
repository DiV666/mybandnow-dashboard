import { describe, it, expect, beforeEach } from 'vitest';
import { mock, mockReset } from 'vitest-mock-extended';
import { GetBandByIdUseCase } from './GetBandByIdUseCase.js';
import type { BandRepository } from '../../domain/band/repository/BandRepository.js';
import { Band } from '../../domain/band/Band.js';

describe('GetBandByIdUseCase', () => {
	const repositoryMock = mock<BandRepository>();
	let useCase: GetBandByIdUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetBandByIdUseCase(repositoryMock);
	});

	it('should return null if the band does not exist', async () => {
		repositoryMock.getById.mockResolvedValue(null);

		const band = await useCase.run('123');

		expect(repositoryMock.getById).toHaveBeenCalledWith('123');
		expect(band).toBeNull();
	});

	it('should return the band if it exists', async () => {
		const bandMock = mock<Band>();
		repositoryMock.getById.mockResolvedValue(bandMock);

		const band = await useCase.run('123');

		expect(band).toBe(bandMock);
	});
});

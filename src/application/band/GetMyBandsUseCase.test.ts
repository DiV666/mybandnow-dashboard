import { describe, it, expect, beforeEach } from 'vitest';
import { mock, mockReset } from 'vitest-mock-extended';
import { GetMyBandsUseCase } from './GetMyBandsUseCase.js';
import type { BandRepository } from '../../domain/band/repository/BandRepository.js';
import { Band } from '../../domain/band/Band.js';

describe('GetMyBandsUseCase', () => {
	const repositoryMock = mock<BandRepository>();
	let useCase: GetMyBandsUseCase;

	beforeEach(() => {
		mockReset(repositoryMock);
		useCase = new GetMyBandsUseCase(repositoryMock);
	});

	it('should return an empty array if the user has no bands', async () => {
		repositoryMock.getAll.mockResolvedValue([]);

		const bands = await useCase.run();

		expect(repositoryMock.getAll).toHaveBeenCalled();
		expect(bands).toEqual([]);
	});

	it('should return the user bands', async () => {
		const bandMock = mock<Band>();
		repositoryMock.getAll.mockResolvedValue([bandMock]);

		const bands = await useCase.run();

		expect(bands).toHaveLength(1);
		expect(bands[0]).toBe(bandMock);
	});
});

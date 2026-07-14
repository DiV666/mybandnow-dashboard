import type { BandRepository } from '../../domain/band/repository/BandRepository.js';
import type { Band } from '../../domain/band/Band.js';

export class GetMyBandsUseCase {
  private readonly repository: BandRepository;

  constructor(repository: BandRepository) {
    this.repository = repository;
  }

  async run(): Promise<Band[]> {
    return this.repository.getAll();
  }
}

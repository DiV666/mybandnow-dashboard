import type { BandRepository } from '../../domain/band/repository/BandRepository.js';
import type { Band } from '../../domain/band/Band.js';

export class GetBandByIdUseCase {
  private readonly repository: BandRepository;

  constructor(repository: BandRepository) {
    this.repository = repository;
  }

  async run(id: string): Promise<Band | null> {
    return this.repository.getById(id);
  }
}

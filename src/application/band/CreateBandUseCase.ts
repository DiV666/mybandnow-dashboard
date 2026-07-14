import type { BandRepository } from '../../domain/band/repository/BandRepository.js';
import { Band } from '../../domain/band/Band.js';
import { BandId } from '../../domain/band/value-object/BandId.js';
import { BandName } from '../../domain/band/value-object/BandName.js';

export class CreateBandUseCase {
  private readonly repository: BandRepository;

  constructor(repository: BandRepository) {
    this.repository = repository;
  }

  async run(id: string, name: string): Promise<void> {
    const band = Band.create(
      new BandId(id),
      new BandName(name)
    );
    await this.repository.save(band);
  }
}

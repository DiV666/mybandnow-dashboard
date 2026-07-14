import type { Band } from '../Band.js';

export interface BandRepository {
  getAll(): Promise<Band[]>;
  getById(id: string): Promise<Band | null>;
  save(band: Band): Promise<void>;
}

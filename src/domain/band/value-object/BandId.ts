export class BandId {
  readonly value: string;
  constructor(value: string) {
    if (!value) throw new Error('BandId cannot be empty');
    // Simplified UUID validation for the example
    this.value = value;
  }
}

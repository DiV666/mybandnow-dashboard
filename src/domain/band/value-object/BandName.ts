export class BandName {
  readonly value: string;
  constructor(value: string) {
    if (!value) throw new Error('BandName cannot be empty');
    this.value = value;
  }
}

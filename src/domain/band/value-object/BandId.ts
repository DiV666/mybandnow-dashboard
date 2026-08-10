import { ValidationError } from '../../shared/ValidationError.js';

export class BandId {
	readonly value: string;
	constructor(value: string) {
		if (!value) throw new ValidationError('BandId cannot be empty');
		this.value = value;
	}
}

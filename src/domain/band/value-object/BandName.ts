import { ValidationError } from '../../shared/ValidationError.js';

export class BandName {
	readonly value: string;
	constructor(value: string) {
		if (!value) throw new ValidationError('BandName cannot be empty');
		this.value = value;
	}
}

import { BandId } from './value-object/BandId.js';
import { BandName } from './value-object/BandName.js';

export type BandPrimitives = {
	id: string;
	name: string;
};

export class Band {
	readonly id: BandId;
	readonly name: BandName;

	constructor(id: BandId, name: BandName) {
		this.id = id;
		this.name = name;
	}

	static create(id: BandId, name: BandName): Band {
		return new Band(id, name);
	}

	static fromPrimitives(primitives: BandPrimitives): Band {
		return new Band(
			new BandId(primitives.id),
			new BandName(primitives.name)
		);
	}

	toPrimitives(): BandPrimitives {
		return {
			id: this.id.value,
			name: this.name.value
		};
	}
}

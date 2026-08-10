import { InstrumentId } from "./value-object/InstrumentId.js";
import { InstrumentName } from "./value-object/InstrumentName.js";

export type InstrumentPrimitives = {
	id: string;
	name: string;
	description: string;
	createdAt: string;
};

export class Instrument {
	readonly id: InstrumentId;
	readonly name: InstrumentName;
	readonly description: string;
	readonly createdAt: string;

	constructor(
		id: InstrumentId,
		name: InstrumentName,
		description: string,
		createdAt: string,
	) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.createdAt = createdAt;
	}

	static fromPrimitives(primitives: InstrumentPrimitives): Instrument {
		return new Instrument(
			new InstrumentId(primitives.id),
			new InstrumentName(primitives.name),
			primitives.description,
			primitives.createdAt,
		);
	}

	toPrimitives(): InstrumentPrimitives {
		return {
			id: this.id.value,
			name: this.name.value,
			description: this.description,
			createdAt: this.createdAt,
		};
	}
}

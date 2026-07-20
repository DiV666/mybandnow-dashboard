import { InstrumentId } from "../instrument/value-object/InstrumentId.js";
import { MusicianId } from "../musician/value-object/MusicianId.js";
import { SongInstrumentId } from "./value-object/SongInstrumentId.js";
import { SongInstrumentName } from "./value-object/SongInstrumentName.js";

export type SongInstrumentPrimitives = {
	id: string;
	name: string;
	instrumentId: string;
	musicianId: string;
};

export class SongInstrument {
	readonly id: SongInstrumentId;
	readonly name: SongInstrumentName;
	readonly instrumentId: InstrumentId;
	readonly musicianId: MusicianId;

	constructor(
		id: SongInstrumentId,
		name: SongInstrumentName,
		instrumentId: InstrumentId,
		musicianId: MusicianId,
	) {
		this.id = id;
		this.name = name;
		this.instrumentId = instrumentId;
		this.musicianId = musicianId;
	}

	static create(
		id: SongInstrumentId,
		name: SongInstrumentName,
		instrumentId: InstrumentId,
		musicianId: MusicianId,
	): SongInstrument {
		return new SongInstrument(id, name, instrumentId, musicianId);
	}

	static fromPrimitives(primitives: SongInstrumentPrimitives): SongInstrument {
		return new SongInstrument(
			new SongInstrumentId(primitives.id),
			new SongInstrumentName(primitives.name),
			new InstrumentId(primitives.instrumentId),
			new MusicianId(primitives.musicianId),
		);
	}

	toPrimitives(): SongInstrumentPrimitives {
		return {
			id: this.id.value,
			name: this.name.value,
			instrumentId: this.instrumentId.value,
			musicianId: this.musicianId.value,
		};
	}
}

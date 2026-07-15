import { MusicianId } from "../musician/value-object/MusicianId.js";
import { SongInstrumentId } from "./value-object/SongInstrumentId.js";
import { SongInstrumentName } from "./value-object/SongInstrumentName.js";
import { SongInstrumentType } from "./value-object/SongInstrumentType.js";

export type SongInstrumentPrimitives = {
	id: string;
	name: string;
	instrumentType: string;
	musicianId: string;
};

export class SongInstrument {
	readonly id: SongInstrumentId;
	readonly name: SongInstrumentName;
	readonly instrumentType: SongInstrumentType;
	readonly musicianId: MusicianId;

	constructor(
		id: SongInstrumentId,
		name: SongInstrumentName,
		instrumentType: SongInstrumentType,
		musicianId: MusicianId,
	) {
		this.id = id;
		this.name = name;
		this.instrumentType = instrumentType;
		this.musicianId = musicianId;
	}

	static create(
		id: SongInstrumentId,
		name: SongInstrumentName,
		instrumentType: SongInstrumentType,
		musicianId: MusicianId,
	): SongInstrument {
		return new SongInstrument(id, name, instrumentType, musicianId);
	}

	static fromPrimitives(primitives: SongInstrumentPrimitives): SongInstrument {
		return new SongInstrument(
			new SongInstrumentId(primitives.id),
			new SongInstrumentName(primitives.name),
			new SongInstrumentType(primitives.instrumentType),
			new MusicianId(primitives.musicianId),
		);
	}

	toPrimitives(): SongInstrumentPrimitives {
		return {
			id: this.id.value,
			name: this.name.value,
			instrumentType: this.instrumentType.value,
			musicianId: this.musicianId.value,
		};
	}
}

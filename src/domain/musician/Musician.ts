import { MusicianId } from "./value-object/MusicianId.js";
import { MusicianName } from "./value-object/MusicianName.js";
import { MusicianUserId } from "./value-object/MusicianUserId.js";
import { MusicianUsername } from "./value-object/MusicianUsername.js";

export type MusicianPrimitives = {
	id: string;
	userId: string;
	username: string;
	name: string;
};

export class Musician {
	readonly id: MusicianId;
	readonly userId: MusicianUserId;
	readonly username: MusicianUsername;
	readonly name: MusicianName;

	constructor(
		id: MusicianId,
		userId: MusicianUserId,
		username: MusicianUsername,
		name: MusicianName,
	) {
		this.id = id;
		this.userId = userId;
		this.username = username;
		this.name = name;
	}

	static fromPrimitives(primitives: MusicianPrimitives): Musician {
		return new Musician(
			new MusicianId(primitives.id),
			new MusicianUserId(primitives.userId),
			new MusicianUsername(primitives.username),
			new MusicianName(primitives.name),
		);
	}

	toPrimitives(): MusicianPrimitives {
		return {
			id: this.id.value,
			userId: this.userId.value,
			username: this.username.value,
			name: this.name.value,
		};
	}
}

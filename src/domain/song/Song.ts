import { SongId } from "./value-object/SongId.js";
import { SongOriginalVideoclipUrl } from "./value-object/SongOriginalVideoclipUrl.js";
import { SongTitle } from "./value-object/SongTitle.js";

export type SongPrimitives = {
	id: string;
	title: string;
	originalVideoclipUrl: string;
};

export class Song {
	readonly id: SongId;
	readonly title: SongTitle;
	readonly originalVideoclipUrl: SongOriginalVideoclipUrl;

	constructor(
		id: SongId,
		title: SongTitle,
		originalVideoclipUrl: SongOriginalVideoclipUrl,
	) {
		this.id = id;
		this.title = title;
		this.originalVideoclipUrl = originalVideoclipUrl;
	}

	static create(
		id: SongId,
		title: SongTitle,
		originalVideoclipUrl: SongOriginalVideoclipUrl,
	): Song {
		return new Song(id, title, originalVideoclipUrl);
	}

	static fromPrimitives(primitives: SongPrimitives): Song {
		return new Song(
			new SongId(primitives.id),
			new SongTitle(primitives.title),
			new SongOriginalVideoclipUrl(primitives.originalVideoclipUrl),
		);
	}

	toPrimitives(): SongPrimitives {
		return {
			id: this.id.value,
			title: this.title.value,
			originalVideoclipUrl: this.originalVideoclipUrl.value,
		};
	}
}

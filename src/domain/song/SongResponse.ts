export type SongResponse = {
	id: string;
	bandId: string;
	title: string;
	originalVideoclipUrl: string;
	originalVideoClipDurationSeconds: number | null;
};

export type SongCollectionResponse = {
	items: SongResponse[];
	total: number;
};

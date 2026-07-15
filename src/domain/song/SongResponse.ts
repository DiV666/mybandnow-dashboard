export type SongResponse = {
	id: string;
	bandId: string;
	title: string;
	originalVideoclipUrl: string;
};

export type SongCollectionResponse = {
	items: SongResponse[];
	total: number;
};

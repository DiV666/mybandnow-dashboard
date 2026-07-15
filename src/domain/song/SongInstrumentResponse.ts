export type SongInstrumentListItemResponse = {
	id: string;
	name: string;
	instrumentType: string;
	songId: string;
	musicianId: string;
	createdAt: string;
};

export type SongInstrumentCollectionResponse = {
	items: SongInstrumentListItemResponse[];
	total: number;
};

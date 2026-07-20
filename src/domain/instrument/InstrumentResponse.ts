export interface InstrumentResponse {
	id: string;
	name: string;
	description: string;
	createdAt: string;
}

export interface InstrumentCollectionResponse {
	items: InstrumentResponse[];
	total: number;
}

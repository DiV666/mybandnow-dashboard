export const songInstrumentUploadStatuses = {
	PENDING: "PENDING",
	READY: "READY",
	PROCESSING: "PROCESSING",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
} as const;

export type SongInstrumentUploadStatus =
	(typeof songInstrumentUploadStatuses)[keyof typeof songInstrumentUploadStatuses];

export type SongInstrumentUploadPendingStatus = Exclude<
	SongInstrumentUploadStatus,
	typeof songInstrumentUploadStatuses.FAILED
>;

export interface SongInstrumentUploadPendingResponse {
	status: SongInstrumentUploadPendingStatus;
}

export interface SongInstrumentUploadFailedResponse {
	status: typeof songInstrumentUploadStatuses.FAILED;
	errorMessage: string;
}

export type SongInstrumentUploadResponse =
	| SongInstrumentUploadPendingResponse
	| SongInstrumentUploadFailedResponse;

export interface SongInstrumentVideoResponse {
	id: string;
	songInstrumentId: string;
	url: string;
	duration: number;
	size: number;
	createdAt: string;
	startTimeMs?: number;
}

interface SongInstrumentTimelineFields {
	startTimeMs?: number;
}

interface SongInstrumentCatalogReference {
	instrumentId?: string;
	instrumentType?: string;
}

export type SongInstrumentListItemResponse = SongInstrumentCatalogReference &
	SongInstrumentTimelineFields & {
		id: string;
		name: string;
		songId: string;
		musicianId: string;
		createdAt: string;
		upload: SongInstrumentUploadResponse | null;
	};

export interface SongInstrumentDetailResponse
	extends SongInstrumentCatalogReference,
		SongInstrumentTimelineFields {
	id: string;
	name: string;
	songId: string;
	musicianId: string;
	createdAt: string;
	video: SongInstrumentVideoResponse | null;
	upload: SongInstrumentUploadResponse | null;
}

export interface UpdateSongInstrumentPayload {
	name: string;
	instrumentId: string;
	startTimeMs?: number;
}

export interface UpdateSongInstrumentVideoPayload {
	startTimeMs: number;
}

export type SongInstrumentCollectionResponse = {
	items: SongInstrumentListItemResponse[];
	total: number;
};

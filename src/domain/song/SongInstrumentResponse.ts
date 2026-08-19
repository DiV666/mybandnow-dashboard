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
	// Optimistic client-side echoes of this status (set right after the upload starts, before
	// the backend confirms) don't carry an id yet — only the polled server response does.
	id?: string;
	status: SongInstrumentUploadPendingStatus;
}

export const songInstrumentUploadErrorCodes = {
	UNSUPPORTED_CODEC: "UNSUPPORTED_CODEC",
	DURATION_EXCEEDED: "DURATION_EXCEEDED",
	INVALID_VIDEO_FORMAT: "INVALID_VIDEO_FORMAT",
	FILE_NOT_FOUND: "FILE_NOT_FOUND",
	PROCESSING_FAILED: "PROCESSING_FAILED",
} as const;

export type SongInstrumentUploadErrorCode =
	(typeof songInstrumentUploadErrorCodes)[keyof typeof songInstrumentUploadErrorCodes];

export interface SongInstrumentUploadFailedResponse {
	id?: string;
	status: typeof songInstrumentUploadStatuses.FAILED;
	errorMessage: string;
	errorCode?: SongInstrumentUploadErrorCode;
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
		video: SongInstrumentVideoResponse | null;
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

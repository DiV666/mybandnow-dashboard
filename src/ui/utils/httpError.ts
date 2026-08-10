export interface HttpErrorData {
	message?: string;
	errorMessage?: string;
	code?: string;
}

export interface HttpErrorResponse {
	status?: number;
	data?: HttpErrorData;
}

export interface HttpErrorLike {
	response?: HttpErrorResponse;
	message?: string;
	name?: string;
	code?: string;
}

export function isHttpErrorLike(error: unknown): error is HttpErrorLike {
	return typeof error === "object" && error !== null;
}

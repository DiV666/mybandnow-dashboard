export function hasResponseStatus(
	error: unknown,
	status: number,
): error is { response: { status: number } } {
	if (typeof error !== "object" || error === null || !("response" in error)) {
		return false;
	}

	const { response } = error;
	if (
		typeof response !== "object" ||
		response === null ||
		!("status" in response)
	) {
		return false;
	}

	return response.status === status;
}

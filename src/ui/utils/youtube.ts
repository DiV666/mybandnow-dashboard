export function getYoutubeVideoId(url: string): string | null {
	try {
		const parsed = new URL(url);

		if (parsed.hostname.includes("youtu.be")) {
			const videoId = parsed.pathname.slice(1);
			return videoId.length > 0 ? videoId : null;
		}

		if (parsed.hostname.includes("youtube.com")) {
			if (parsed.pathname.startsWith("/embed/")) {
				const videoId = parsed.pathname.slice("/embed/".length);
				return videoId.length > 0 ? videoId : null;
			}

			return parsed.searchParams.get("v");
		}

		return null;
	} catch {
		return null;
	}
}

import { describe, expect, it } from "vitest";
import { getYoutubeVideoId } from "./youtube.js";

describe("getYoutubeVideoId", () => {
	it("extracts the id from a watch URL", () => {
		expect(getYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
	});

	it("extracts the id from a watch URL with extra query params", () => {
		expect(
			getYoutubeVideoId(
				"https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=2",
			),
		).toBe("dQw4w9WgXcQ");
	});

	it("extracts the id from a youtu.be short URL", () => {
		expect(getYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
	});

	it("extracts the id from an already-embed URL", () => {
		expect(getYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
	});

	it("returns null for a youtu.be URL without a path", () => {
		expect(getYoutubeVideoId("https://youtu.be/")).toBeNull();
	});

	it("returns null for a watch URL without the v parameter", () => {
		expect(getYoutubeVideoId("https://www.youtube.com/watch")).toBeNull();
	});

	it("returns null for a non-YouTube URL", () => {
		expect(getYoutubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
	});

	it("returns null for an invalid URL", () => {
		expect(getYoutubeVideoId("not a url")).toBeNull();
	});
});

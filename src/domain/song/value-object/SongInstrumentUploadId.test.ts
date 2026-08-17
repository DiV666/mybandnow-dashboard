import { describe, expect, it } from "vitest";
import { SongInstrumentUploadId } from "./SongInstrumentUploadId.js";

describe("SongInstrumentUploadId", () => {
	it("accepts a non-empty value", () => {
		const valueObject = new SongInstrumentUploadId("upload-1");

		expect(valueObject.value).toBe("upload-1");
	});

	it("rejects an empty value", () => {
		expect(() => new SongInstrumentUploadId("")).toThrow(
			"SongInstrumentUploadId cannot be empty",
		);
	});
});

import { describe, expect, it } from "vitest";
import { SongVideoclipId } from "./SongVideoclipId.js";

describe("SongVideoclipId", () => {
	it("accepts a non-empty value", () => {
		const valueObject = new SongVideoclipId("11111111-1111-4111-8111-111111111111");

		expect(valueObject.value).toBe("11111111-1111-4111-8111-111111111111");
	});

	it("rejects an empty value", () => {
		expect(() => new SongVideoclipId("")).toThrow(
			"SongVideoclipId cannot be empty",
		);
	});
});

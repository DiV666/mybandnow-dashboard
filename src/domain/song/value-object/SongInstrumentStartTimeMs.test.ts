import { describe, expect, it } from "vitest";
import { SongInstrumentStartTimeMs } from "./SongInstrumentStartTimeMs.js";

describe("SongInstrumentStartTimeMs", () => {
	it("accepts a non-negative finite value", () => {
		const valueObject = new SongInstrumentStartTimeMs(1500);

		expect(valueObject.value).toBe(1500);
	});

	it("accepts zero", () => {
		const valueObject = new SongInstrumentStartTimeMs(0);

		expect(valueObject.value).toBe(0);
	});

	it("rejects a negative value", () => {
		expect(() => new SongInstrumentStartTimeMs(-1)).toThrow(
			"SongInstrumentStartTimeMs must be a non-negative finite number",
		);
	});

	it("rejects a non-finite value", () => {
		expect(() => new SongInstrumentStartTimeMs(Number.NaN)).toThrow(
			"SongInstrumentStartTimeMs must be a non-negative finite number",
		);
	});
});

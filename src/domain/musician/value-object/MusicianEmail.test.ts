import { describe, expect, it } from "vitest";
import { MusicianEmail } from "./MusicianEmail.js";

describe("MusicianEmail", () => {
	it("accepts a valid email", () => {
		const valueObject = new MusicianEmail("artist@example.com");

		expect(valueObject.value).toBe("artist@example.com");
	});

	it("trims surrounding whitespace before storing the email", () => {
		const valueObject = new MusicianEmail("  artist@example.com  ");

		expect(valueObject.value).toBe("artist@example.com");
	});

	it("rejects an empty email", () => {
		expect(() => new MusicianEmail("   ")).toThrow(
			"MusicianEmail cannot be empty",
		);
	});

	it("rejects an invalid email format", () => {
		expect(() => new MusicianEmail("invalid-email")).toThrow(
			"MusicianEmail must be a valid email",
		);
	});
});

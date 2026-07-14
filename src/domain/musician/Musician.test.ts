import { describe, expect, it } from "vitest";
import { Musician } from "./Musician.js";

describe("Musician", () => {
	it("hydrates and serializes musician primitives without changing the contract", () => {
		const primitives = {
			id: "11111111-1111-4111-8111-111111111111",
			userId: "22222222-2222-4222-8222-222222222222",
			username: "jimi_hendrix",
			name: "Jimi Hendrix",
		};

		const musician = Musician.fromPrimitives(primitives);

		expect(musician.id.value).toBe(primitives.id);
		expect(musician.userId.value).toBe(primitives.userId);
		expect(musician.username.value).toBe(primitives.username);
		expect(musician.name.value).toBe(primitives.name);
		expect(musician.toPrimitives()).toEqual(primitives);
	});
});

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
	resolve(process.cwd(), "src/style.css"),
	"utf8",
);

const filesWithoutLargeBootstrapClasses = [
	"src/ui/components/CompleteProfileModal.vue",
	"src/ui/views/auth/LoginView.vue",
	"src/ui/views/SessionClosedView.vue",
	"src/ui/views/public/LandingView.vue",
	"src/ui/views/dashboard/band/CreateFirstBandView.vue",
] as const;

describe("global style contracts", () => {
	it("restores the global button padding without shrinking form controls", () => {
		expect(stylesheet).toContain(".btn {");
		expect(stylesheet).toContain("padding: 0.8rem 1.3rem;");
		expect(stylesheet).toContain(
			".public-navbar__cta,\n.public-navbar__current {",
		);
		expect(stylesheet).toContain(".form-control,\n.form-select {");
		expect(stylesheet).toContain("padding: 0.8rem 1rem;");
	});

	it("keeps affected views free from bootstrap large-size utility classes", () => {
		for (const filePath of filesWithoutLargeBootstrapClasses) {
			const source = readFileSync(resolve(process.cwd(), filePath), "utf8");

			expect(source).not.toMatch(/\bbtn-lg\b/);
			expect(source).not.toMatch(/\bform-control-lg\b/);
		}
	});

	it("lets modal titles inherit the header text color instead of the global heading color", () => {
		expect(stylesheet).toContain(".modal-header .modal-title {");
		expect(stylesheet).toContain("color: inherit;");
	});
});

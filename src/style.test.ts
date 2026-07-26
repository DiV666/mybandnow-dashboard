/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
	resolve(process.cwd(), "src/style.css"),
	"utf8",
);
const dashboardLayoutSource = readFileSync(
	resolve(process.cwd(), "src/ui/layouts/DashboardLayout.vue"),
	"utf8",
);
const themeToggleSource = readFileSync(
	resolve(process.cwd(), "src/ui/components/ThemeToggle.vue"),
	"utf8",
);
const sessionExpiredModalSource = readFileSync(
	resolve(process.cwd(), "src/ui/components/SessionExpiredModal.vue"),
	"utf8",
);
const completeProfileModalSource = readFileSync(
	resolve(process.cwd(), "src/ui/components/CompleteProfileModal.vue"),
	"utf8",
);
const backendUnavailableModalSource = readFileSync(
	resolve(process.cwd(), "src/ui/components/BackendUnavailableModal.vue"),
	"utf8",
);
const toastViewportSource = readFileSync(
	resolve(process.cwd(), "src/ui/components/AppToastViewport.vue"),
	"utf8",
);

function readOverlayZIndex(variableName: string): number {
	const declarationPrefix = `${variableName}: `;
	const declarationStart = stylesheet.indexOf(declarationPrefix);

	if (declarationStart === -1) {
		throw new Error(`Expected overlay token ${variableName} to exist`);
	}

	const valueStart = declarationStart + declarationPrefix.length;
	const valueEnd = stylesheet.indexOf(";", valueStart);

	if (valueEnd === -1) {
		throw new Error(
			`Expected overlay token ${variableName} to end with a semicolon`,
		);
	}

	return Number(stylesheet.slice(valueStart, valueEnd).trim());
}

const filesWithoutLargeBootstrapClasses = [
	"src/ui/components/CompleteProfileModal.vue",
	"src/ui/views/auth/LoginView.vue",
	"src/ui/views/SessionClosedView.vue",
	"src/ui/views/public/LandingView.vue",
	"src/ui/views/dashboard/band/CreateFirstBandView.vue",
] as const;

const filesWithoutHardcodedThemeColors = [
	"src/ui/views/SessionClosedView.vue",
	"src/ui/views/dashboard/MembersView.vue",
	"src/ui/components/CompleteProfileModal.vue",
	"src/ui/components/SessionExpiredModal.vue",
	"src/ui/components/BackendUnavailableModal.vue",
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

	it("keeps core components and views free from hardcoded light/dark theme color classes", () => {
		for (const filePath of filesWithoutHardcodedThemeColors) {
			const source = readFileSync(resolve(process.cwd(), filePath), "utf8");

			expect(source).not.toMatch(/\b(bg-white|bg-light|text-dark|text-muted)\b/);
		}
	});

	it("lets modal titles inherit the header text color instead of the global heading color", () => {
		expect(stylesheet).toContain(".modal-header .modal-title {");
		expect(stylesheet).toContain("color: inherit;");
	});

	it("defines a shared overlay z-index scale and applies it across dashboard layers", () => {
		expect(stylesheet).toContain("--rock-z-dashboard-topbar: 100;");
		expect(stylesheet).toContain("--rock-z-dashboard-dropdown: 110;");
		expect(stylesheet).toContain("--rock-z-floating-control: 120;");
		expect(stylesheet).toContain("--rock-z-session-expired-backdrop: 1040;");
		expect(stylesheet).toContain("--rock-z-session-expired-modal: 1050;");
		expect(stylesheet).toContain("--rock-z-complete-profile-backdrop: 1060;");
		expect(stylesheet).toContain("--rock-z-complete-profile-modal: 1070;");
		expect(stylesheet).toContain(
			"--rock-z-backend-unavailable-backdrop: 1080;",
		);
		expect(stylesheet).toContain("--rock-z-backend-unavailable-modal: 1090;");
		expect(stylesheet).toContain("--rock-z-toast: 2000;");
		expect(dashboardLayoutSource).toContain(
			"z-index: var(--rock-z-dashboard-topbar);",
		);
		expect(dashboardLayoutSource).toContain(
			"z-index: var(--rock-z-dashboard-dropdown);",
		);
		expect(themeToggleSource).toContain(
			"z-index: var(--rock-z-floating-control);",
		);
		expect(sessionExpiredModalSource).toContain(
			"var(--rock-z-session-expired-backdrop)",
		);
		expect(sessionExpiredModalSource).toContain(
			"var(--rock-z-session-expired-modal)",
		);
		expect(completeProfileModalSource).toContain(
			"var(--rock-z-complete-profile-backdrop)",
		);
		expect(completeProfileModalSource).toContain(
			"var(--rock-z-complete-profile-modal)",
		);
		expect(backendUnavailableModalSource).toContain(
			"var(--rock-z-backend-unavailable-backdrop)",
		);
		expect(backendUnavailableModalSource).toContain(
			"var(--rock-z-backend-unavailable-modal)",
		);
		expect(toastViewportSource).toContain("z-index: var(--rock-z-toast);");
	});

	it("keeps modal overlay z-index tokens in semantic CSS classes instead of inline styles", () => {
		expect(sessionExpiredModalSource).toContain(
			'class="session-expired-modal modal fade show d-block"',
		);
		expect(sessionExpiredModalSource).not.toContain(
			'style="z-index: var(--rock-z-session-expired-modal); background-color: rgba(0, 0, 0, 0.4);"',
		);
		expect(completeProfileModalSource).toContain(
			'class="complete-profile-modal-backdrop modal-backdrop fade show"',
		);
		expect(completeProfileModalSource).toContain(
			'class="complete-profile-modal modal fade show d-block"',
		);
		expect(completeProfileModalSource).not.toContain(
			'style="z-index: var(--rock-z-complete-profile-backdrop); background-color: rgba(0, 0, 0, 0.7);"',
		);
		expect(completeProfileModalSource).not.toContain(
			'style="z-index: var(--rock-z-complete-profile-modal);"',
		);
		expect(backendUnavailableModalSource).toContain(
			'class="backend-unavailable-modal-backdrop modal-backdrop fade show"',
		);
		expect(backendUnavailableModalSource).toContain(
			'class="backend-unavailable-modal modal fade show d-block"',
		);
		expect(backendUnavailableModalSource).not.toContain(
			'style="z-index: var(--rock-z-backend-unavailable-backdrop); background-color: rgba(0, 0, 0, 0.55);"',
		);
		expect(backendUnavailableModalSource).not.toContain(
			'style="z-index: var(--rock-z-backend-unavailable-modal);"',
		);
	});

	it("keeps dashboard chrome below blocking overlays while leaving toasts on top", () => {
		expect(readOverlayZIndex("--rock-z-dashboard-topbar")).toBeLessThan(
			readOverlayZIndex("--rock-z-dashboard-dropdown"),
		);
		expect(readOverlayZIndex("--rock-z-dashboard-dropdown")).toBeLessThan(
			readOverlayZIndex("--rock-z-floating-control"),
		);
		expect(readOverlayZIndex("--rock-z-floating-control")).toBeLessThan(
			readOverlayZIndex("--rock-z-session-expired-backdrop"),
		);
		expect(readOverlayZIndex("--rock-z-session-expired-backdrop")).toBeLessThan(
			readOverlayZIndex("--rock-z-session-expired-modal"),
		);
		expect(readOverlayZIndex("--rock-z-session-expired-modal")).toBeLessThan(
			readOverlayZIndex("--rock-z-complete-profile-backdrop"),
		);
		expect(readOverlayZIndex("--rock-z-complete-profile-modal")).toBeLessThan(
			readOverlayZIndex("--rock-z-backend-unavailable-backdrop"),
		);
		expect(
			readOverlayZIndex("--rock-z-backend-unavailable-modal"),
		).toBeLessThan(readOverlayZIndex("--rock-z-toast"));
	});
});

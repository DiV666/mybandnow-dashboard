import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../../infrastructure/config/i18n.js";
import {
	resolveDocumentTitle,
	resolvePageDescription,
	resolvePageTitle,
} from "./useDocumentMeta.js";

const t = i18n.global.t;

describe("resolvePageTitle", () => {
	beforeEach(() => {
		i18n.global.locale.value = "es";
	});

	it("translates the route's titleKey", () => {
		const route = { name: "SongsManager", query: {}, meta: { titleKey: "dashboard.songs.pageTitle" } };

		expect(resolvePageTitle(route, t)).toBe(t("dashboard.songs.pageTitle"));
	});

	it("returns null when the route has no titleKey", () => {
		const route = { name: "Landing", query: {}, meta: {} };

		expect(resolvePageTitle(route, t)).toBeNull();
	});

	it("uses the song's own name as the title for the track editor instead of a fixed one", () => {
		const route = { name: "SongTrackEditor", query: { title: "21 guns" }, meta: {} };

		expect(resolvePageTitle(route, t)).toBe("21 guns");
	});

	it("falls back to the default track editor title when the route has no song title query", () => {
		const route = { name: "SongTrackEditor", query: {}, meta: {} };

		expect(resolvePageTitle(route, t)).toBe(t("dashboard.trackEditor.defaultTitle"));
	});
});

describe("resolvePageDescription", () => {
	beforeEach(() => {
		i18n.global.locale.value = "es";
	});

	it("translates the route's descriptionKey", () => {
		const route = { meta: { descriptionKey: "dashboard.songs.pageDescription" } };

		expect(resolvePageDescription(route, t)).toBe(t("dashboard.songs.pageDescription"));
	});

	it("returns null when the route has no descriptionKey", () => {
		expect(resolvePageDescription({ meta: {} }, t)).toBeNull();
	});
});

describe("resolveDocumentTitle", () => {
	it("prefixes the page title with the brand name", () => {
		expect(resolveDocumentTitle("Canciones")).toBe("My Band Now - Canciones");
	});

	it("falls back to just the brand name when there is no page title", () => {
		expect(resolveDocumentTitle(null)).toBe("My Band Now");
	});
});

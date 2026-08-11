import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, createRenderer, ref, type ComputedRef, type Ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useAssignMusician } from "./useAssignMusician.js";
import { useToastStore } from "../stores/useToastStore.js";
import { i18n } from "../../infrastructure/config/i18n.js";
import type { BandMemberResponse } from "../../domain/band/BandMemberResponse.js";
import type {
	SongInstrumentDetailResponse,
	SongInstrumentListItemResponse,
} from "../../domain/song/SongInstrumentResponse.js";
import type { SongResponse } from "../../domain/song/SongResponse.js";
import type { MusicianSummaryResponse } from "../../domain/musician/MusicianSummaryResponse.js";

type TestNode = { type: string; parent: TestNode | null; children: TestNode[] };

// Vue's custom renderer allows mounting a real component instance without a DOM,
// which is required for `useI18n()`/`useToastStore()` to resolve their component context.
const renderer = createRenderer<TestNode, TestNode>({
	patchProp() {},
	insert(child, parent) {
		child.parent = parent;
		parent.children.push(child);
	},
	remove(child) {
		if (!child.parent) {
			return;
		}
		child.parent.children = child.parent.children.filter((node) => node !== child);
		child.parent = null;
	},
	createElement(type) {
		return { type, parent: null, children: [] };
	},
	createText(text) {
		return { type: text, parent: null, children: [] };
	},
	createComment(text) {
		return { type: text, parent: null, children: [] };
	},
	setText() {},
	setElementText() {},
	parentNode(node) {
		return node.parent;
	},
	nextSibling(node) {
		if (!node.parent) {
			return null;
		}
		const index = node.parent.children.indexOf(node);
		return node.parent.children[index + 1] ?? null;
	},
});

function withSetup<T>(composable: () => T): T {
	let result: T;
	const pinia = createPinia();
	setActivePinia(pinia);
	const app = renderer.createApp({
		setup() {
			result = composable();
			return () => null;
		},
	});
	app.use(pinia);
	app.use(i18n);
	app.mount({ type: "root", parent: null, children: [] });
	return result!;
}

function makeSong(overrides: Partial<SongResponse> = {}): SongResponse {
	return {
		id: "song-1",
		title: "My Song",
		bandId: "band-1",
		originalVideoclipUrl: "",
		...overrides,
	} as SongResponse;
}

function makeInstrument(
	overrides: Partial<SongInstrumentListItemResponse> = {},
): SongInstrumentListItemResponse {
	return {
		id: "instrument-1",
		name: "Guitar",
		musicianId: "",
		...overrides,
	} as SongInstrumentListItemResponse;
}

function makeMusician(overrides: Partial<MusicianSummaryResponse> = {}): MusicianSummaryResponse {
	return {
		id: "musician-1",
		name: "Musician Name",
		username: "musician",
		...overrides,
	};
}

describe("useAssignMusician", () => {
	const getBandMembersUseCase = { run: vi.fn() };
	const assignSongInstrumentMusicianUseCase = { run: vi.fn() };
	const inviteSongInstrumentMusicianUseCase = { run: vi.fn() };
	const getMusicianByIdUseCase = { run: vi.fn() };

	beforeEach(() => {
		getBandMembersUseCase.run.mockReset();
		assignSongInstrumentMusicianUseCase.run.mockReset();
		inviteSongInstrumentMusicianUseCase.run.mockReset();
		getMusicianByIdUseCase.run.mockReset();
		i18n.global.locale.value = "en";
	});

	function createComposable(options: {
		songs?: Ref<SongResponse[]>;
		selectedBandId?: ComputedRef<string | null>;
		instrument?: SongInstrumentListItemResponse | null;
	} = {}) {
		const songs = options.songs ?? ref<SongResponse[]>([makeSong()]);
		const selectedBandId = options.selectedBandId ?? computed(() => "band-1");
		const instrument = options.instrument ?? makeInstrument();
		const getSongInstrument = vi.fn(() => instrument);
		const refreshSongInstrumentDetail = vi
			.fn()
			.mockResolvedValue({} as SongInstrumentDetailResponse);
		const resolveMusicianDisplayName = vi.fn(
			(name: string, username: string) => name.trim() || (username.trim() ? `@${username.trim()}` : ""),
		);
		const extractUploadErrorDetails = vi.fn((error: unknown) => {
			if (error && typeof error === "object" && "response" in error) {
				const response = (error as { response?: { status?: number } }).response;
				return { status: response?.status };
			}
			return {};
		});

		let toastStore: ReturnType<typeof useToastStore>;

		const composable = withSetup(() => {
			toastStore = useToastStore();
			return useAssignMusician({
				getBandMembersUseCase,
				assignSongInstrumentMusicianUseCase,
				inviteSongInstrumentMusicianUseCase,
				getMusicianByIdUseCase,
				songs,
				selectedBandId,
				getSongInstrument,
				refreshSongInstrumentDetail,
				resolveMusicianDisplayName,
				extractUploadErrorDetails,
			});
		});

		return {
			...composable,
			songs,
			instrument,
			getSongInstrument,
			refreshSongInstrumentDetail,
			toastStore: toastStore!,
		};
	}

	it("initializes the modal state and loads band members on open", async () => {
		const bandMember: BandMemberResponse = { musicianId: "musician-1", role: "MEMBER" };
		getBandMembersUseCase.run.mockResolvedValue([bandMember]);
		getMusicianByIdUseCase.run.mockResolvedValue(makeMusician());
		const { openAssignMusicianModal, activeAssignMusicianModal } = createComposable();

		openAssignMusicianModal("song-1", "instrument-1");

		expect(activeAssignMusicianModal.value).toMatchObject({
			songId: "song-1",
			instrumentId: "instrument-1",
			email: "",
			isSubmitting: false,
			isLoadingMembers: true,
			members: [],
		});
		await vi.waitFor(() => {
			expect(activeAssignMusicianModal.value?.isLoadingMembers).toBe(false);
		});
		expect(getBandMembersUseCase.run).toHaveBeenCalledWith("band-1");
		expect(activeAssignMusicianModal.value?.members).toEqual([
			{ id: "musician-1", name: "Musician Name", username: "@musician" },
		]);
	});

	it("filters out members whose musician profile could not be resolved", async () => {
		const bandMembers: BandMemberResponse[] = [
			{ musicianId: "musician-1", role: "MEMBER" },
			{ musicianId: "musician-2", role: "MEMBER" },
		];
		getBandMembersUseCase.run.mockResolvedValue(bandMembers);
		getMusicianByIdUseCase.run.mockImplementation(async (musicianId: string) =>
			musicianId === "musician-1" ? makeMusician({ id: "musician-1" }) : null,
		);
		const { openAssignMusicianModal, activeAssignMusicianModal } = createComposable();

		openAssignMusicianModal("song-1", "instrument-1");
		await vi.waitFor(() => {
			expect(activeAssignMusicianModal.value?.isLoadingMembers).toBe(false);
		});

		expect(activeAssignMusicianModal.value?.members).toHaveLength(1);
		expect(activeAssignMusicianModal.value?.members[0].id).toBe("musician-1");
	});

	it("assigns the musician, refreshes the detail, closes the modal, and shows a success toast", async () => {
		getBandMembersUseCase.run.mockResolvedValue([]);
		assignSongInstrumentMusicianUseCase.run.mockResolvedValue(undefined);
		const {
			openAssignMusicianModal,
			assignMusicianById,
			activeAssignMusicianModal,
			refreshSongInstrumentDetail,
			toastStore,
		} = createComposable();
		openAssignMusicianModal("song-1", "instrument-1");
		await vi.waitFor(() => {
			expect(activeAssignMusicianModal.value?.isLoadingMembers).toBe(false);
		});

		await assignMusicianById("musician-1");

		expect(assignSongInstrumentMusicianUseCase.run).toHaveBeenCalledWith(
			"song-1",
			"instrument-1",
			"musician-1",
		);
		expect(refreshSongInstrumentDetail).toHaveBeenCalledWith("song-1", "instrument-1");
		expect(activeAssignMusicianModal.value).toBeNull();
		expect(toastStore.toasts[0].message).toBe("Musician assigned successfully.");
	});

	it("keeps the modal open with a mapped error message when assignment fails", async () => {
		getBandMembersUseCase.run.mockResolvedValue([]);
		assignSongInstrumentMusicianUseCase.run.mockRejectedValue({ response: { status: 403 } });
		const { openAssignMusicianModal, assignMusicianById, activeAssignMusicianModal, toastStore } =
			createComposable();
		openAssignMusicianModal("song-1", "instrument-1");
		await vi.waitFor(() => {
			expect(activeAssignMusicianModal.value?.isLoadingMembers).toBe(false);
		});

		await assignMusicianById("musician-1");

		expect(activeAssignMusicianModal.value).not.toBeNull();
		expect(activeAssignMusicianModal.value?.isSubmitting).toBe(false);
		expect(activeAssignMusicianModal.value?.errorMsg).toBe(
			"You don't have permission to assign musicians to this instrument.",
		);
		expect(toastStore.toasts[0].message).toBe(
			"You don't have permission to assign musicians to this instrument.",
		);
	});

	it("invites the musician by email, refreshes the detail, and closes the modal on success", async () => {
		getBandMembersUseCase.run.mockResolvedValue([]);
		inviteSongInstrumentMusicianUseCase.run.mockResolvedValue(undefined);
		const {
			openAssignMusicianModal,
			handleAssignMusicianEmailInput,
			handleAssignMusicianSubmit,
			activeAssignMusicianModal,
			refreshSongInstrumentDetail,
			toastStore,
		} = createComposable();
		openAssignMusicianModal("song-1", "instrument-1");
		await vi.waitFor(() => {
			expect(activeAssignMusicianModal.value?.isLoadingMembers).toBe(false);
		});
		handleAssignMusicianEmailInput({ target: { value: "musician@example.com" } } as unknown as Event);

		await handleAssignMusicianSubmit();

		expect(inviteSongInstrumentMusicianUseCase.run).toHaveBeenCalledWith(
			"song-1",
			"instrument-1",
			"musician@example.com",
		);
		expect(refreshSongInstrumentDetail).toHaveBeenCalledWith("song-1", "instrument-1");
		expect(activeAssignMusicianModal.value).toBeNull();
		expect(toastStore.toasts[0].message).toBe("Invitation sent successfully.");
	});

	it("keeps the modal open with a mapped error message when the invitation fails", async () => {
		getBandMembersUseCase.run.mockResolvedValue([]);
		inviteSongInstrumentMusicianUseCase.run.mockRejectedValue({ response: { status: 400 } });
		const {
			openAssignMusicianModal,
			handleAssignMusicianEmailInput,
			handleAssignMusicianSubmit,
			activeAssignMusicianModal,
			toastStore,
		} = createComposable();
		openAssignMusicianModal("song-1", "instrument-1");
		await vi.waitFor(() => {
			expect(activeAssignMusicianModal.value?.isLoadingMembers).toBe(false);
		});
		handleAssignMusicianEmailInput({ target: { value: "musician@example.com" } } as unknown as Event);

		await handleAssignMusicianSubmit();

		expect(activeAssignMusicianModal.value).not.toBeNull();
		expect(activeAssignMusicianModal.value?.isSubmitting).toBe(false);
		expect(activeAssignMusicianModal.value?.errorMsg).toBe(
			"We couldn't send the invitation to the given email.",
		);
		expect(toastStore.toasts[0].message).toBe(
			"We couldn't send the invitation to the given email.",
		);
	});

	it("updates the email and clears the error on input", async () => {
		getBandMembersUseCase.run.mockResolvedValue([]);
		const { openAssignMusicianModal, handleAssignMusicianEmailInput, activeAssignMusicianModal } =
			createComposable();
		openAssignMusicianModal("song-1", "instrument-1");
		await vi.waitFor(() => {
			expect(activeAssignMusicianModal.value?.isLoadingMembers).toBe(false);
		});
		activeAssignMusicianModal.value = {
			...activeAssignMusicianModal.value!,
			errorMsg: "previous error",
		};

		handleAssignMusicianEmailInput({ target: { value: "new@example.com" } } as unknown as Event);

		expect(activeAssignMusicianModal.value?.email).toBe("new@example.com");
		expect(activeAssignMusicianModal.value?.errorMsg).toBe("");
	});

	it("reports the invite email as invalid until it is a well-formed address", async () => {
		getBandMembersUseCase.run.mockResolvedValue([]);
		const {
			openAssignMusicianModal,
			handleAssignMusicianEmailInput,
			activeAssignMusicianModal,
			isInviteEmailValid,
		} = createComposable();
		openAssignMusicianModal("song-1", "instrument-1");
		await vi.waitFor(() => {
			expect(activeAssignMusicianModal.value?.isLoadingMembers).toBe(false);
		});

		expect(isInviteEmailValid.value).toBe(false);

		handleAssignMusicianEmailInput({ target: { value: "not-an-email" } } as unknown as Event);
		expect(isInviteEmailValid.value).toBe(false);

		handleAssignMusicianEmailInput({
			target: { value: "musician@example.com" },
		} as unknown as Event);
		expect(isInviteEmailValid.value).toBe(true);
	});

	it("does not invite when the email is invalid, even if submit is called directly", async () => {
		getBandMembersUseCase.run.mockResolvedValue([]);
		const {
			openAssignMusicianModal,
			handleAssignMusicianSubmit,
			activeAssignMusicianModal,
		} = createComposable();
		openAssignMusicianModal("song-1", "instrument-1");
		await vi.waitFor(() => {
			expect(activeAssignMusicianModal.value?.isLoadingMembers).toBe(false);
		});

		await handleAssignMusicianSubmit();

		expect(inviteSongInstrumentMusicianUseCase.run).not.toHaveBeenCalled();
		expect(activeAssignMusicianModal.value).not.toBeNull();
	});
});

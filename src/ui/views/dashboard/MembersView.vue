<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { AddBandMemberUseCase } from "../../../application/band/AddBandMemberUseCase.js";
import { GetBandMembersUseCase } from "../../../application/band/GetBandMembersUseCase.js";
import { GetMusicianByIdUseCase } from "../../../application/musician/GetMusicianByIdUseCase.js";
import {
	bandMemberRoles,
	type BandMemberRole,
} from "../../../domain/band/BandMemberResponse.js";
import { AxiosBandRepository } from "../../../infrastructure/band/AxiosBandRepository.js";
import { AxiosMusicianRepository } from "../../../infrastructure/musician/AxiosMusicianRepository.js";
import { useBandStore } from "../../stores/useBandStore.js";
import { useToastStore } from "../../stores/useToastStore.js";

interface MemberCardViewModel {
	id: string;
	name: string;
	username: string;
	role: string;
	roleClass: string;
	avatarInitials: string;
}

interface HttpErrorResponse {
	status?: number;
}

interface HttpErrorLike {
	response?: HttpErrorResponse;
}

const { t } = useI18n();
const bandStore = useBandStore();
const toastStore = useToastStore();
const bandRepository = new AxiosBandRepository();
const musicianRepository = new AxiosMusicianRepository();
const addBandMemberUseCase = new AddBandMemberUseCase(bandRepository);
const getBandMembersUseCase = new GetBandMembersUseCase(bandRepository);
const getMusicianByIdUseCase = new GetMusicianByIdUseCase(musicianRepository);

const members = ref<MemberCardViewModel[]>([]);
const isLoadingMembers = ref(false);
const membersErrorMsg = ref("");
const isAddMemberModalOpen = ref(false);
const musicianEmail = ref("");
const errorMsg = ref("");
const isSubmitting = ref(false);
const selectedBandId = computed(() => bandStore.selectedBandId);

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
	return typeof error === "object" && error !== null && "response" in error;
}

function getAvatarInitials(name: string): string {
	const parts = name
		.trim()
		.split(/\s+/)
		.filter((part) => part.length > 0)
		.slice(0, 2);

	if (parts.length === 0) {
		return "MB";
	}

	return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function mapRole(role: BandMemberRole): Pick<MemberCardViewModel, "role" | "roleClass"> {
	if (role === bandMemberRoles.ADMIN) {
		return {
			role: t("views.members.roles.admin"),
			roleClass: "text-bg-warning",
		};
	}

	return {
		role: t("views.members.roles.member"),
		roleClass: "member-role-badge--member",
	};
}

async function loadMembers(bandId: string | null): Promise<void> {
	if (!bandId) {
		members.value = [];
		membersErrorMsg.value = "";
		isLoadingMembers.value = false;
		return;
	}

	isLoadingMembers.value = true;
		membersErrorMsg.value = "";

	try {
		const bandMembers = await getBandMembersUseCase.run(bandId);
		const resolvedMembers = await Promise.all(
			bandMembers.map(async (member) => {
				const musician = await getMusicianByIdUseCase.run(member.musicianId);
				if (!musician) {
					return null;
				}

				const mappedRole = mapRole(member.role);
				return {
					id: musician.id,
					name: musician.name,
					username: `@${musician.username}`,
					role: mappedRole.role,
					roleClass: mappedRole.roleClass,
					avatarInitials: getAvatarInitials(musician.name),
				} satisfies MemberCardViewModel;
			}),
		);

		if (selectedBandId.value !== bandId) {
			return;
		}

		members.value = resolvedMembers.filter(
			(member): member is MemberCardViewModel => member !== null,
		);
	} catch (error: unknown) {
		if (selectedBandId.value !== bandId) {
			return;
		}

		const message =
			error instanceof Error
				? error.message
				: t("views.members.errors.loadFailed");
		members.value = [];
		membersErrorMsg.value = message;
		toastStore.error(message);
	} finally {
		if (selectedBandId.value === bandId) {
			isLoadingMembers.value = false;
		}
	}
}

watch(
	selectedBandId,
	(bandId) => {
		void loadMembers(bandId);
	},
	{ immediate: true },
);

function openAddMemberModal(): void {
	musicianEmail.value = "";
	isAddMemberModalOpen.value = true;
}

function closeAddMemberModal(): void {
	isAddMemberModalOpen.value = false;
	musicianEmail.value = "";
	errorMsg.value = "";
	isSubmitting.value = false;
}

function mapAddMemberErrorMessage(error: unknown): string {
	if (isHttpErrorLike(error) && error.response?.status === 400) {
		return t("views.members.errors.addFailed");
	}

	if (
		error instanceof Error &&
		error.message.includes("MusicianEmail must be a valid email")
	) {
		return t("views.members.errors.addFailed");
	}

	return t("views.members.errors.addUnexpected");
}

async function handleAddMember(): Promise<void> {
	errorMsg.value = "";
	const bandId = selectedBandId.value;
	const trimmedEmail = musicianEmail.value.trim();

	if (!bandId) {
		const message = t("views.members.errors.noBandSelected");
		errorMsg.value = message;
		toastStore.error(message);
		return;
	}

	if (!trimmedEmail) {
		const message = t("views.members.errors.emptyEmail");
		errorMsg.value = message;
		toastStore.error(message);
		return;
	}

	isSubmitting.value = true;
	musicianEmail.value = trimmedEmail;

	try {
		await addBandMemberUseCase.run(bandId, trimmedEmail);
		await loadMembers(bandId);
		toastStore.success(t("views.members.success.memberAdded"));
		closeAddMemberModal();
	} catch (error: unknown) {
		const message = mapAddMemberErrorMessage(error);
		errorMsg.value = message;
		toastStore.error(message);
		isSubmitting.value = false;
	}
}
</script>

<template>
  <div>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom gap-3">
      <div>
        <h1 class="h2 mb-1">{{ $t('views.members.title') }}</h1>
        <p class="text-body-secondary mb-0">
          {{ $t('views.members.description') }}
        </p>
      </div>

      <div class="btn-toolbar mb-2 mb-md-0">
        <button
          type="button"
          class="btn btn-primary members-toolbar-button"
          @click="openAddMemberModal"
        >
          {{ $t('views.members.addMember') }}
        </button>
      </div>
    </div>

    <section class="card border-0 shadow-sm bg-body-tertiary" data-testid="members-panel">
      <div class="card-body p-4">
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h2 class="h5 mb-1">{{ $t('views.members.currentTeam') }}</h2>
            <p class="text-body-secondary mb-0 small">
              {{ $t('views.members.memberCount', members.length) }}
            </p>
          </div>
          <span class="badge bg-body-secondary text-body border members-count-badge">{{ $t('views.members.countBadge', { count: members.length }) }}</span>
        </div>

        <p v-if="!selectedBandId" class="text-body-secondary mb-0">
          {{ $t('views.members.selectBand') }}
        </p>

        <p v-else-if="isLoadingMembers" class="text-body-secondary mb-0" data-testid="members-loading-state">
          {{ $t('views.members.loading') }}
        </p>

        <p v-else-if="membersErrorMsg" class="text-body-secondary mb-0">
          {{ $t('views.members.loadError') }}
        </p>

        <div v-else-if="members.length === 0" class="border rounded-4 surface-container p-4 p-md-5 text-center members-empty-state" data-testid="members-empty-state">
          <div
            class="mx-auto mb-3 d-inline-flex align-items-center justify-content-center rounded-circle bg-body-secondary text-secondary shadow-sm"
            style="width: 72px; height: 72px;"
            aria-hidden="true"
          >
            🎸
          </div>
          <h3 class="h6 mb-2">{{ $t('views.members.emptyTitle') }}</h3>
          <p class="text-body-secondary mb-3">
            {{ $t('views.members.emptyDescription') }}
          </p>
          <button
            type="button"
            class="btn btn-outline-primary empty-state-action"
            @click="openAddMemberModal"
          >
            {{ $t('views.members.addFirstMember') }}
          </button>
        </div>

        <div v-else class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3" data-testid="members-grid">
          <div v-for="member in members" :key="member.id" class="col">
            <article class="card h-100 border-0 shadow-sm overflow-hidden member-card">
              <div class="member-card-header border-bottom px-4 py-3 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <div>
                  <p class="text-uppercase text-body-secondary fw-semibold small mb-1">{{ $t('views.members.profileLabel') }}</p>
                  <h3 class="h6 mb-0">{{ member.name }}</h3>
                </div>
                <span class="badge rounded-pill member-role-badge" :class="member.roleClass">{{ member.role }}</span>
              </div>

              <div class="card-body p-4 d-flex flex-column gap-3 member-card-body">
                <div class="d-flex gap-3 align-items-center">
                  <div
                    class="rounded-circle bg-body-secondary text-secondary fw-semibold d-inline-flex align-items-center justify-content-center flex-shrink-0 border member-avatar"
                    :aria-label="$t('views.members.avatarAlt', { name: member.name })"
                  >
                    {{ member.avatarInitials }}
                  </div>

                  <div class="min-w-0">
                    <p class="mb-1 fw-semibold text-truncate">{{ member.username }}</p>
                    <p class="text-body-secondary small mb-0">{{ $t('views.members.activeMember') }}</p>
                  </div>
                </div>

              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <div v-if="isAddMemberModalOpen" class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" data-testid="add-member-modal">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title h5 mb-0">{{ $t('views.members.modal.title') }}</h2>
            <button type="button" class="btn-close" :aria-label="$t('views.members.modal.close')" :disabled="isSubmitting" @click="closeAddMemberModal" />
          </div>

          <form data-testid="add-member-form" @submit.prevent="handleAddMember">
            <div class="modal-body">
              <p class="text-body-secondary small">
                {{ $t('views.members.modal.description') }}
              </p>

                  <label for="member-email" class="form-label">{{ $t('views.members.modal.emailLabel') }}</label>

              <input
                id="member-email"
                data-testid="add-member-email-input"
                v-model="musicianEmail"
                type="email"
                class="form-control"
                placeholder="artist@example.com"
                :disabled="isSubmitting"
                autocomplete="email"
              >
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" :disabled="isSubmitting" @click="closeAddMemberModal">
                {{ $t('views.members.modal.cancel') }}
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                {{ isSubmitting ? $t('views.members.modal.submitLoading') : $t('views.members.modal.submit') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.members-toolbar-button,
.empty-state-action,
.member-card {
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

.members-toolbar-button:focus-visible,
.empty-state-action:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.2);
}

.members-count-badge {
  letter-spacing: 0.02em;
}

.members-empty-state {
  border-style: dashed;
}

.empty-state-action:hover,
.empty-state-action:focus-visible,
.members-toolbar-button:hover,
.members-toolbar-button:focus-visible {
  transform: translateY(-1px);
}

.member-card {
  border: 1px solid rgba(var(--bs-body-color-rgb), 0.08);
}

.member-card:hover {
  box-shadow: var(--bs-box-shadow) !important;
  border-color: rgba(var(--bs-body-color-rgb), 0.16);
}

.member-card-header {
  background-color: transparent;
}

.member-card-body {
  min-height: 100%;
}

.member-role-badge {
  letter-spacing: 0.01em;
}

.member-role-badge--member {
  background-color: rgba(var(--bs-secondary-rgb), 0.1);
  color: var(--bs-body-color);
  border: 1px solid rgba(var(--bs-secondary-rgb), 0.25);
}

.member-avatar {
  width: 72px;
  height: 72px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}


@media (max-width: 575.98px) {
  .member-card {
    min-height: 100%;
  }
}
</style>

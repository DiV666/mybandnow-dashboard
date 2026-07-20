<script setup lang="ts">
import { computed, ref, watch } from "vue";
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

const bandStore = useBandStore();
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
			role: "Admin",
			roleClass: "text-bg-warning text-dark",
		};
	}

	return {
		role: "Miembro",
		roleClass: "text-bg-secondary",
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

		members.value = [];
		membersErrorMsg.value =
			error instanceof Error
				? error.message
				: "Ocurrió un error inesperado al cargar los miembros.";
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
	errorMsg.value = "";
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
		return "No pudimos agregar al músico. Verificá el email e intentá nuevamente.";
	}

	if (
		error instanceof Error &&
		error.message.includes("MusicianEmail must be a valid email")
	) {
		return "No pudimos agregar al músico. Verificá el email e intentá nuevamente.";
	}

	return "Ocurrió un error inesperado al agregar el miembro.";
}

async function handleAddMember(): Promise<void> {
	errorMsg.value = "";
	const bandId = selectedBandId.value;
	const trimmedEmail = musicianEmail.value.trim();

	if (!bandId) {
		errorMsg.value = "Selecciona una banda antes de agregar miembros.";
		return;
	}

	if (!trimmedEmail) {
		errorMsg.value = "Escribí el email del músico antes de confirmar.";
		return;
	}

	isSubmitting.value = true;
	musicianEmail.value = trimmedEmail;

	try {
		await addBandMemberUseCase.run(bandId, trimmedEmail);
		await loadMembers(bandId);
		closeAddMemberModal();
	} catch (error: unknown) {
		errorMsg.value = mapAddMemberErrorMessage(error);
		isSubmitting.value = false;
	}
}
</script>

<template>
  <div>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom gap-3">
      <div>
        <h1 class="h2 mb-1">Miembros de la banda</h1>
        <p class="text-muted mb-0">
          Gestiona a las personas que forman parte del proyecto.
        </p>
      </div>

      <div class="btn-toolbar mb-2 mb-md-0">
        <button
          type="button"
          class="btn btn-primary members-toolbar-button"
          @click="openAddMemberModal"
        >
          Agregar miembro
        </button>
      </div>
    </div>

    <section class="card border-0 shadow-sm bg-body-tertiary" data-testid="members-panel">
      <div class="card-body p-4">
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h2 class="h5 mb-1">Equipo actual</h2>
            <p class="text-muted mb-0 small">
              {{ members.length }} integrante<span v-if="members.length !== 1">s</span> cargado<span v-if="members.length !== 1">s</span>.
            </p>
          </div>
          <span class="badge text-bg-light border members-count-badge">{{ members.length }} miembros</span>
        </div>

        <p v-if="!selectedBandId" class="text-muted mb-0">
          Selecciona una banda para ver sus miembros.
        </p>

        <p v-else-if="isLoadingMembers" class="text-muted mb-0" data-testid="members-loading-state">
          Cargando miembros...
        </p>

        <div v-else-if="membersErrorMsg" class="alert alert-danger mb-0" role="alert">
          {{ membersErrorMsg }}
        </div>

        <div v-else-if="members.length === 0" class="border rounded-4 bg-white p-4 p-md-5 text-center members-empty-state" data-testid="members-empty-state">
          <div
            class="mx-auto mb-3 d-inline-flex align-items-center justify-content-center rounded-circle bg-body-secondary text-secondary shadow-sm"
            style="width: 72px; height: 72px;"
            aria-hidden="true"
          >
            🎸
          </div>
          <h3 class="h6 mb-2">Todavía no hay miembros cargados.</h3>
          <p class="text-muted mb-3">
            Agrega tu primer integrante para empezar a gestionar roles, ensayos y colaboraciones.
          </p>
          <button
            type="button"
            class="btn btn-outline-primary empty-state-action"
            @click="openAddMemberModal"
          >
            Agregar primer miembro
          </button>
        </div>

        <div v-else class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3" data-testid="members-grid">
          <div v-for="member in members" :key="member.id" class="col">
            <article class="card h-100 border-0 shadow-sm overflow-hidden bg-white member-card">
              <div class="bg-body-tertiary border-bottom px-4 py-3 d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <div>
                  <p class="text-uppercase text-muted fw-semibold small mb-1">Perfil de músico</p>
                  <h3 class="h6 mb-0">{{ member.name }}</h3>
                </div>
                <span class="badge rounded-pill member-role-badge" :class="member.roleClass">{{ member.role }}</span>
              </div>

              <div class="card-body p-4 d-flex flex-column gap-3">
                <div class="d-flex gap-3 align-items-center">
                  <div
                    class="rounded-circle bg-body-secondary text-secondary fw-semibold d-inline-flex align-items-center justify-content-center flex-shrink-0 border member-avatar"
                    style="width: 72px; height: 72px;"
                    :aria-label="`Avatar placeholder de ${member.name}`"
                  >
                    {{ member.avatarInitials }}
                  </div>

                  <div class="min-w-0">
                    <p class="mb-1 fw-semibold text-truncate">{{ member.username }}</p>
                    <p class="text-muted small mb-0">Integrante activo de la banda</p>
                  </div>
                </div>

                <dl class="row g-2 mb-0 small member-details">
                  <div class="col-12 col-sm-6">
                    <dt class="text-uppercase text-muted fw-semibold mb-1">Usuario</dt>
                    <dd class="mb-0 text-body">{{ member.username }}</dd>
                  </div>
                  <div class="col-12 col-sm-6">
                    <dt class="text-uppercase text-muted fw-semibold mb-1">Rol dentro de la banda</dt>
                    <dd class="mb-0 text-body">{{ member.role }}</dd>
                  </div>
                </dl>

                <div class="rounded-3 bg-body-tertiary px-3 py-2 border small text-muted member-note">
                  Disponible para colaborar en canciones, ensayos y nuevas grabaciones.
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
            <h2 class="modal-title h5 mb-0">Agregar miembro</h2>
            <button type="button" class="btn-close" aria-label="Cerrar" :disabled="isSubmitting" @click="closeAddMemberModal" />
          </div>

          <form data-testid="add-member-form" @submit.prevent="handleAddMember">
            <div class="modal-body">
              <p class="text-muted small">
                Ingresa el email del músico para sumarlo a la banda como miembro.
              </p>

              <div v-if="errorMsg" class="alert alert-danger mb-3" role="alert" data-testid="add-member-error">
                {{ errorMsg }}
              </div>

              <label for="member-email" class="form-label">Email del músico</label>
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
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                {{ isSubmitting ? 'Agregando...' : 'Agregar miembro' }}
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
  border: 1px solid rgba(13, 110, 253, 0.08);
}

.member-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--bs-box-shadow) !important;
  border-color: rgba(13, 110, 253, 0.2);
}

.member-role-badge {
  letter-spacing: 0.01em;
}

.member-avatar {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.member-details dt {
  font-size: 0.7rem;
}

.member-note {
  margin-top: auto;
}

@media (max-width: 575.98px) {
  .member-card {
    min-height: 100%;
  }
}
</style>

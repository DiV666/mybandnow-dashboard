<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { CreateSongInstrumentUseCase } from "../../../application/song/CreateSongInstrumentUseCase.js";
import { CreateSongUseCase } from "../../../application/song/CreateSongUseCase.js";
import { GetBandSongsUseCase } from "../../../application/song/GetBandSongsUseCase.js";
import { GetSongInstrumentsUseCase } from "../../../application/song/GetSongInstrumentsUseCase.js";
import type { SongInstrumentListItemResponse } from "../../../domain/song/SongInstrumentResponse.js";
import type { SongResponse } from "../../../domain/song/SongResponse.js";
import { AxiosSongRepository } from "../../../infrastructure/song/AxiosSongRepository.js";
import { useBandStore } from "../../stores/useBandStore.js";
import { useMusicianStore } from "../../stores/useMusicianStore.js";

interface HttpErrorResponse {
	status?: number;
}

interface HttpErrorLike {
	response?: HttpErrorResponse;
}

interface SongInstrumentFormState {
	isVisible: boolean;
	name: string;
	instrumentType: string;
	isSubmitting: boolean;
	errorMsg: string;
}

type SongInstrumentMap = Record<string, SongInstrumentListItemResponse[]>;
type SongInstrumentFormMap = Record<string, SongInstrumentFormState>;

const bandStore = useBandStore();
const musicianStore = useMusicianStore();
const title = ref("");
const originalVideoclipUrl = ref("");
const errorMsg = ref("");
const songsErrorMsg = ref("");
const successMsg = ref("");
const isLoading = ref(false);
const isLoadingSongs = ref(false);
const songs = ref<SongResponse[]>([]);
const songInstruments = ref<SongInstrumentMap>({});
const songInstrumentForms = ref<SongInstrumentFormMap>({});

const songRepository = new AxiosSongRepository();
const createSongUseCase = new CreateSongUseCase(songRepository);
const getBandSongsUseCase = new GetBandSongsUseCase(songRepository);
const createSongInstrumentUseCase = new CreateSongInstrumentUseCase(songRepository);
const getSongInstrumentsUseCase = new GetSongInstrumentsUseCase(songRepository);

const selectedBand = computed(() => bandStore.selectedBand);
const canSubmit = computed(
	() => !isLoading.value && selectedBand.value !== null,
);

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
	return typeof error === "object" && error !== null && "response" in error;
}

function getSongInstrumentForm(songId: string): SongInstrumentFormState {
	const current = songInstrumentForms.value[songId];
	if (current) {
		return current;
	}

	const nextState: SongInstrumentFormState = {
		isVisible: false,
		name: "",
		instrumentType: "",
		isSubmitting: false,
		errorMsg: "",
	};
	songInstrumentForms.value = {
		...songInstrumentForms.value,
		[songId]: nextState,
	};
	return nextState;
}

function hasSongInstrumentForm(songId: string): boolean {
	return songId in songInstrumentForms.value;
}

function setSongInstrumentForm(
	songId: string,
	updates: Partial<SongInstrumentFormState>,
): void {
	const current = getSongInstrumentForm(songId);
	songInstrumentForms.value = {
		...songInstrumentForms.value,
		[songId]: {
			...current,
			...updates,
		},
	};
}

let lastSongsRequestId = 0;

async function loadSongInstruments(songList: SongResponse[]): Promise<void> {
	const entries = await Promise.all(
		songList.map(async (song) => {
			const instruments = await getSongInstrumentsUseCase.run(song.id);
			return [song.id, instruments] as const;
		}),
	);

	songInstruments.value = Object.fromEntries(entries);
}

async function loadSongs(bandId: string | null) {
	const requestId = ++lastSongsRequestId;

	if (!bandId) {
		songs.value = [];
		songInstruments.value = {};
		songInstrumentForms.value = {};
		songsErrorMsg.value = "";
		isLoadingSongs.value = false;
		return;
	}

	isLoadingSongs.value = true;
	songsErrorMsg.value = "";

	try {
		const nextSongs = await getBandSongsUseCase.run(bandId);
		if (requestId !== lastSongsRequestId) {
			return;
		}

		songs.value = nextSongs;
		songInstrumentForms.value = Object.fromEntries(
			nextSongs.map((song) => [song.id, getSongInstrumentForm(song.id)]),
		);
		await loadSongInstruments(nextSongs);
	} catch (error: unknown) {
		if (requestId !== lastSongsRequestId) {
			return;
		}

		songs.value = [];
		songInstruments.value = {};
		songInstrumentForms.value = {};
		songsErrorMsg.value =
			error instanceof Error
				? error.message
				: "Ocurrió un error inesperado al cargar las canciones.";
	} finally {
		if (requestId === lastSongsRequestId) {
			isLoadingSongs.value = false;
		}
	}
}

watch(
	selectedBand,
	(band) => {
		void loadSongs(band?.id.value ?? null);
	},
	{ immediate: true },
);

async function handleCreateSong() {
	errorMsg.value = "";
	successMsg.value = "";

	if (!selectedBand.value) {
		errorMsg.value = "Selecciona una banda antes de crear una canción.";
		return;
	}

	isLoading.value = true;

	try {
		const bandId = selectedBand.value.id.value;
		await createSongUseCase.run(
			bandId,
			crypto.randomUUID(),
			title.value,
			originalVideoclipUrl.value,
		);

		title.value = "";
		originalVideoclipUrl.value = "";
		successMsg.value = "Canción creada correctamente.";
		if (selectedBand.value?.id.value === bandId) {
			await loadSongs(bandId);
		}
	} catch (error: unknown) {
		if (isHttpErrorLike(error) && error.response?.status === 409) {
			errorMsg.value = "Ya existe una canción con esos datos. Inténtalo de nuevo.";
		} else if (error instanceof Error) {
			errorMsg.value = error.message;
		} else {
			errorMsg.value = "Ocurrió un error inesperado al crear la canción.";
		}
	} finally {
		isLoading.value = false;
	}
}

function toggleSongInstrumentForm(songId: string): void {
	const current = getSongInstrumentForm(songId);
	setSongInstrumentForm(songId, {
		isVisible: !current.isVisible,
		errorMsg: "",
	});
}

async function handleCreateSongInstrument(songId: string): Promise<void> {
	const musicianProfileId = musicianStore.profile?.id;
	if (!musicianProfileId) {
		setSongInstrumentForm(songId, {
			errorMsg: "Debes completar tu perfil de músico para añadir instrumentos.",
		});
		return;
	}

	const form = getSongInstrumentForm(songId);
	setSongInstrumentForm(songId, {
		isSubmitting: true,
		errorMsg: "",
	});

	try {
		await createSongInstrumentUseCase.run(
			songId,
			crypto.randomUUID(),
			form.name,
			form.instrumentType,
			musicianProfileId,
		);
		const instruments = await getSongInstrumentsUseCase.run(songId);
		songInstruments.value = {
			...songInstruments.value,
			[songId]: instruments,
		};
		setSongInstrumentForm(songId, {
			isVisible: false,
			name: "",
			instrumentType: "",
			isSubmitting: false,
		});
	} catch (error: unknown) {
		if (isHttpErrorLike(error) && error.response?.status === 409) {
			setSongInstrumentForm(songId, {
				errorMsg:
					"Ya existe un instrumento con esos datos para esta canción. Inténtalo de nuevo.",
				isSubmitting: false,
			});
			return;
		}

		if (isHttpErrorLike(error) && error.response?.status === 403) {
			setSongInstrumentForm(songId, {
				errorMsg:
					"No tienes permisos para añadir instrumentos a esta canción.",
				isSubmitting: false,
			});
			return;
		}

		setSongInstrumentForm(songId, {
			errorMsg:
				error instanceof Error
					? error.message
					: "Ocurrió un error inesperado al añadir el instrumento.",
			isSubmitting: false,
		});
	} finally {
		if (hasSongInstrumentForm(songId) && getSongInstrumentForm(songId).isSubmitting) {
			setSongInstrumentForm(songId, {
				isSubmitting: false,
			});
		}
	}
}
</script>

<template>
  <div>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <div>
        <h1 class="h2">Gestión de Canciones (Songs / Tracks)</h1>
        <p class="text-muted mb-0">
          Crea una canción dentro de la banda seleccionada.
        </p>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <p class="mb-3">
          <strong>Banda seleccionada:</strong>
          <span v-if="selectedBand">{{ selectedBand.name.value }}</span>
          <span v-else>No hay banda seleccionada.</span>
        </p>

        <div v-if="!selectedBand" class="alert alert-warning" role="alert">
          Debes seleccionar una banda para crear canciones.
        </div>

        <div v-if="successMsg" class="alert alert-success" role="alert">
          {{ successMsg }}
        </div>

        <div v-if="errorMsg" class="alert alert-danger" role="alert">
          {{ errorMsg }}
        </div>

        <form class="row g-3" @submit.prevent="handleCreateSong">
          <div class="col-12">
            <label for="songTitle" class="form-label">Título</label>
            <input
              id="songTitle"
              v-model="title"
              type="text"
              class="form-control"
              placeholder="Ej. Paint It Black"
              :disabled="isLoading"
              required
            >
          </div>

          <div class="col-12">
            <label for="originalVideoclipUrl" class="form-label">URL del videoclip original</label>
            <input
              id="originalVideoclipUrl"
              v-model="originalVideoclipUrl"
              type="url"
              class="form-control"
              placeholder="https://www.youtube.com/watch?v=..."
              :disabled="isLoading"
              required
            >
          </div>

          <div class="col-12">
            <button type="submit" class="btn btn-primary" :disabled="!canSubmit">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              {{ isLoading ? 'Creando...' : 'Crear canción' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="h5 mb-0">Canciones de la banda</h2>
          <span v-if="selectedBand && !isLoadingSongs" class="text-muted small">
            {{ songs.length }} canciones
          </span>
        </div>

        <p v-if="!selectedBand" class="text-muted mb-0">
          Selecciona una banda para ver sus canciones.
        </p>

        <p v-else-if="isLoadingSongs" class="text-muted mb-0">
          Cargando canciones...
        </p>

        <div v-else-if="songsErrorMsg" class="alert alert-danger mb-0" role="alert">
          {{ songsErrorMsg }}
        </div>

        <p v-else-if="songs.length === 0" class="text-muted mb-0">
          Esta banda todavía no tiene canciones.
        </p>

        <div v-else class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Videoclip original</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="song in songs" :key="song.id">
                <td>
                  <div class="fw-semibold">{{ song.title }}</div>
                  <div class="mt-2">
                    <button type="button" class="btn btn-outline-secondary btn-sm" @click="toggleSongInstrumentForm(song.id)">
                      Añadir instrumento
                    </button>
                  </div>
                  <form
                    v-if="songInstrumentForms[song.id]?.isVisible"
                    :data-song-id="song.id"
                    class="row g-2 mt-2"
                    @submit.prevent="handleCreateSongInstrument(song.id)"
                  >
                    <div class="col-12 col-md-6">
                      <label :for="`songInstrumentName-${song.id}`" class="form-label mb-1">Nombre del instrumento</label>
                      <input
                        :id="`songInstrumentName-${song.id}`"
                        v-model="songInstrumentForms[song.id].name"
                        type="text"
                        class="form-control form-control-sm"
                        :disabled="songInstrumentForms[song.id].isSubmitting"
                        required
                      >
                    </div>
                    <div class="col-12 col-md-6">
                      <label :for="`songInstrumentType-${song.id}`" class="form-label mb-1">Tipo de instrumento</label>
                      <input
                        :id="`songInstrumentType-${song.id}`"
                        v-model="songInstrumentForms[song.id].instrumentType"
                        type="text"
                        class="form-control form-control-sm"
                        :disabled="songInstrumentForms[song.id].isSubmitting"
                        required
                      >
                    </div>
                    <div v-if="songInstrumentForms[song.id].errorMsg" class="col-12">
                      <div class="alert alert-danger mb-0 py-2" role="alert">
                        {{ songInstrumentForms[song.id].errorMsg }}
                      </div>
                    </div>
                    <div class="col-12">
                      <button
                        type="submit"
                        class="btn btn-sm btn-primary"
                        :disabled="songInstrumentForms[song.id].isSubmitting"
                      >
                        <span
                          v-if="songInstrumentForms[song.id].isSubmitting"
                          class="spinner-border spinner-border-sm me-2"
                          aria-hidden="true"
                        ></span>
                        {{ songInstrumentForms[song.id].isSubmitting ? 'Añadiendo...' : 'Guardar instrumento' }}
                      </button>
                    </div>
                  </form>
                  <div class="mt-3">
                    <h3 class="h6">Instrumentos</h3>
                    <p v-if="(songInstruments[song.id] ?? []).length === 0" class="text-muted mb-0 small">
                      Esta canción todavía no tiene instrumentos.
                    </p>
                    <ul v-else class="list-unstyled mb-0 small">
                      <li v-for="instrument in songInstruments[song.id]" :key="instrument.id">
                        {{ instrument.name }} · {{ instrument.instrumentType }}
                      </li>
                    </ul>
                  </div>
                </td>
                <td>
                  <a :href="song.originalVideoclipUrl" target="_blank" rel="noreferrer noopener">
                    {{ song.originalVideoclipUrl }}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

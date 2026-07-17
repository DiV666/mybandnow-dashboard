<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { CreateBandUseCase } from '../../../../application/band/CreateBandUseCase.js';
import { AxiosBandRepository } from '../../../../infrastructure/band/AxiosBandRepository.js';
import { useBandStore } from '../../../stores/useBandStore.js';

interface HttpErrorResponse {
  status?: number;
}

interface HttpErrorLike {
  response?: HttpErrorResponse;
}

const router = useRouter();
const bandStore = useBandStore();
const bandName = ref('');
const errorMsg = ref('');
const isLoading = ref(false);
const showCreateBandForm = ref(false);

const bandRepository = new AxiosBandRepository();
const createBandUseCase = new CreateBandUseCase(bandRepository);

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  return typeof error === 'object' && error !== null && 'response' in error;
}

async function handleCreateBand() {
  errorMsg.value = '';
  
  if (!bandName.value.trim()) {
    errorMsg.value = 'El nombre de la banda no puede estar vacío';
    return;
  }
  
  isLoading.value = true;
  
  try {
    const newBandId = crypto.randomUUID();
    await createBandUseCase.run(newBandId, bandName.value);
    
    // The dashboard shell already mounted, so we force a refresh to reload bands.
    window.location.href = '/dashboard'; 
  } catch (error: unknown) {
    if (isHttpErrorLike(error) && error.response?.status === 409) {
      errorMsg.value = 'Hubo un conflicto al crear la banda. Inténtalo de nuevo.';
    } else {
      errorMsg.value = 'Ocurrió un error inesperado al crear tu banda.';
    }
  } finally {
    isLoading.value = false;
  }
}

function handleSkipForNow() {
  bandStore.skipBandOnboarding();
  router.push({ name: 'DashboardHome' });
}

function handleShowCreateBandForm() {
  showCreateBandForm.value = true;
}
</script>

<template>
  <div class="row justify-content-center mt-5">
    <div class="col-md-8 col-lg-6">
      <div class="card shadow-sm border-primary">
        <div class="card-body p-5 text-center">
          <h2 class="mb-3 text-primary">¡Bienvenido a Mybandnow!</h2>
          <p class="text-muted mb-4">
            Parece que aún no formas parte de ninguna banda. <br>
            Puedes crear tu primer grupo musical ahora o continuar y hacerlo más tarde.
          </p>

          <div class="d-grid gap-3">
            <button
              v-if="!showCreateBandForm"
              type="button"
              class="btn btn-primary btn-lg"
              @click="handleShowCreateBandForm"
            >
              Crear una banda
            </button>

            <div v-if="errorMsg" class="alert alert-danger mb-0" role="alert">
              {{ errorMsg }}
            </div>

            <form v-if="showCreateBandForm" @submit.prevent="handleCreateBand">
              <div class="mb-4 text-start">
                <label for="bandName" class="form-label fw-bold">Nombre de la Banda</label>
                <input 
                  type="text" 
                  class="form-control form-control-lg" 
                  id="bandName" 
                  v-model="bandName"
                  placeholder="Ej. The Rolling Stones"
                  required
                >
              </div>
              
              <button 
                type="submit" 
                class="btn btn-primary btn-lg w-100" 
                :disabled="isLoading"
              >
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ isLoading ? 'Creando...' : 'Crear mi banda' }}
              </button>
            </form>

            <button
              type="button"
              class="btn btn-link"
              :disabled="isLoading"
              @click="handleSkipForNow"
            >
              Omitir por ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

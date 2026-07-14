<script setup lang="ts">
import { ref } from 'vue';
import { CreateBandUseCase } from '../../../../application/band/CreateBandUseCase.js';
import { AxiosBandRepository } from '../../../../infrastructure/band/AxiosBandRepository.js';

const bandName = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

// We use window.location to force full reload

const bandRepository = new AxiosBandRepository();
const createBandUseCase = new CreateBandUseCase(bandRepository);

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
    
    // Al crear, la API devuelve 201. Necesitamos refrescar o añadirla manualmente
    // Para simplificar, añadimos un objeto Band "fake" al store y navegamos, 
    // o forzamos recarga de bandas llamando de nuevo a GetMyBandsUseCase.
    // Como el dashboard ya recarga al montarse, podemos redirigir y el store se rehidratará.
    // Pero como estamos dentro del DashboardLayout, onMounted ya corrió.
    // Lo más limpio es recargar la página entera o pedir las bandas de nuevo.
    window.location.href = '/dashboard'; 
  } catch (error: any) {
    if (error.response?.status === 409) {
      errorMsg.value = 'Hubo un conflicto al crear la banda. Inténtalo de nuevo.';
    } else {
      errorMsg.value = 'Ocurrió un error inesperado al crear tu banda.';
    }
  } finally {
    isLoading.value = false;
  }
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
            Crea tu primer grupo musical para empezar a gestionar tus canciones, músicos y videoclips.
          </p>
          
          <div v-if="errorMsg" class="alert alert-danger" role="alert">
            {{ errorMsg }}
          </div>
          
          <form @submit.prevent="handleCreateBand">
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
        </div>
      </div>
    </div>
  </div>
</template>

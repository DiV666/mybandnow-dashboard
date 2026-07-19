<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMusicianStore } from '../stores/useMusicianStore.js';

const musicianStore = useMusicianStore();

const name = ref('');
const username = ref('');
const errorMsg = ref('');

// Validación en tiempo real del username: sin espacios, sin caracteres especiales, minúsculas
const sanitizedUsername = computed({
  get: () => username.value,
  set: (val: string) => {
    username.value = val.replace(/[^a-z0-9_]/g, '').toLowerCase();
  }
});

const handleSubmit = async () => {
  errorMsg.value = '';
  
  if (!name.value.trim() || !username.value.trim()) {
    errorMsg.value = 'Todos los campos son obligatorios.';
    return;
  }
  
  if (username.value.length < 3) {
    errorMsg.value = 'El nombre de usuario debe tener al menos 3 caracteres.';
    return;
  }

  try {
    await musicianStore.createProfile(name.value.trim(), username.value);
    // Al acabar el await, isProfileCompletionPending bajará a false y el interceptor original continuará
  } catch (error: any) {
    errorMsg.value = error.message || 'Error al guardar el perfil. Quizá el username ya esté en uso.';
  }
};
</script>

<template>
  <div v-if="musicianStore.isProfileCompletionPending" class="modal-backdrop fade show" style="z-index: 1060; background-color: rgba(0, 0, 0, 0.7);"></div>
  
  <div 
    v-if="musicianStore.isProfileCompletionPending"
    class="modal fade show d-block" 
    tabindex="-1" 
    role="dialog"
    style="z-index: 1070;"
  >
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg border-primary">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">
            <i class="bi bi-person-badge-fill me-2"></i> Completa tu perfil
          </h5>
        </div>
        
        <div class="modal-body p-4">
          <p class="mb-4 text-center">
            Para realizar esta acción necesitas completar tu perfil de músico. Solo tomará unos segundos.
          </p>
          
          <div v-if="errorMsg" class="alert alert-danger py-2">
            {{ errorMsg }}
          </div>
          
          <form @submit.prevent="handleSubmit">
            <div class="mb-3">
              <label class="form-label fw-bold">Nombre o Alias Artístico</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="name" 
                placeholder="Ej: John Doe"
                required
                autofocus
                :disabled="musicianStore.isLoading"
              >
            </div>
            
            <div class="mb-4">
              <label class="form-label fw-bold">Nombre de usuario (único)</label>
              <div class="input-group">
                <span class="input-group-text bg-light text-secondary">@</span>
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="sanitizedUsername" 
                  placeholder="ej: john_doe_music"
                  required
                  :disabled="musicianStore.isLoading"
                >
              </div>
              <small class="text-muted d-block mt-1">Solo minúsculas, números y barras bajas.</small>
            </div>
            
            <div class="d-grid gap-2 mt-4">
              <button type="submit" class="btn btn-primary" :disabled="musicianStore.isLoading">
                <span v-if="musicianStore.isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Guardar y continuar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

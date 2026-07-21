<script setup lang="ts">
import { useBackendStatusStore } from "../stores/useBackendStatusStore.js";

const backendStatusStore = useBackendStatusStore();

function closeModal(): void {
	backendStatusStore.clear();
}

function retryConnection(): void {
	backendStatusStore.clear();
}
</script>

<template>
  <div
    v-if="backendStatusStore.isBackendUnavailable"
    class="backend-unavailable-modal-backdrop modal-backdrop fade show"
  ></div>

  <div
    v-if="backendStatusStore.isBackendUnavailable"
    class="backend-unavailable-modal modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="backend-unavailable-title"
  >
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg border-warning">
        <div class="modal-header bg-warning-subtle text-warning-emphasis">
          <h5 id="backend-unavailable-title" class="modal-title">
            <i class="bi bi-wifi-off me-2"></i> Servidor no disponible
          </h5>
        </div>

        <div class="modal-body p-4">
          <p class="mb-3 text-center">
            No hemos podido conectar con el servidor. Revisa si el backend está levantado o inténtalo de nuevo en unos segundos.
          </p>
          <p class="text-muted small mb-0 text-center">
            Tu sesión sigue activa. No cerraremos tu sesión por este problema de conexión.
          </p>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-outline-secondary"
            data-testid="backend-unavailable-close"
            @click="closeModal"
          >
            Cerrar
          </button>
          <button
            type="button"
            class="btn btn-warning"
            data-testid="backend-unavailable-retry"
            @click="retryConnection"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backend-unavailable-modal-backdrop {
  z-index: var(--rock-z-backend-unavailable-backdrop);
  background-color: rgba(0, 0, 0, 0.55);
}

.backend-unavailable-modal {
  z-index: var(--rock-z-backend-unavailable-modal);
}
</style>

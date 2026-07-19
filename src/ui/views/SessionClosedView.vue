<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goLogin = () => {
  router.push({ name: 'Landing' });
};
</script>

<template>
  <div class="container-fluid min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light">
    <div class="text-center p-5 bg-white shadow rounded-3 border-top border-4 border-danger" style="max-width: 500px;">
      <i class="bi bi-shield-lock-fill text-danger mb-4" style="font-size: 4rem;"></i>
      <h2 class="h3 mb-3 text-dark fw-bold">Sesión cerrada por seguridad</h2>
      <p class="text-muted mb-4 fs-5">
        Hemos cerrado tu sesión automáticamente debido a inactividad para proteger tus datos y los de tus músicos.
      </p>
      <button class="btn btn-primary w-100" @click="goLogin">
        Volver a Iniciar Sesión
      </button>
    </div>
  </div>
</template>

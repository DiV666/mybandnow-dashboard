<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goLogin = () => {
  router.push({ name: 'Landing' });
};
</script>

<template>
  <div class="container-fluid min-vh-100 d-flex flex-column justify-content-center align-items-center app-shell-glow">
    <div class="card text-center p-5 surface-container border-top border-4 border-danger" style="max-width: 500px;">
      <i class="bi bi-shield-lock-fill text-danger mb-4" style="font-size: 4rem;" aria-hidden="true"></i>
      <h1 class="h3 mb-3 fw-bold">{{ $t('views.sessionClosed.title') }}</h1>
      <p class="text-body-secondary mb-4 fs-5">
        {{ $t('views.sessionClosed.description') }}
      </p>
      <button type="button" class="btn btn-primary w-100" @click="goLogin">
        {{ $t('views.sessionClosed.action') }}
      </button>
    </div>
  </div>
</template>

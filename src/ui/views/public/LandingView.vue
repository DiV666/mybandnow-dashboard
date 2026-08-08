<template>
  <div class="container text-center py-3 my-auto">
    <h1 class="display-4 fw-bold mb-3">{{ $t('public.landing.title') }}</h1>
    <p class="lead text-body-secondary mb-4">
      {{ $t('public.landing.description') }}
    </p>
    <router-link :to="{ name: 'Login' }" class="btn btn-primary px-5">{{ $t('public.landing.cta') }}</router-link>
  </div>
</template>

<script setup lang="ts">
// Landing page logic
</script>

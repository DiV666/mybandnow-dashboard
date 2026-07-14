<template>
  <router-view />
  <SessionExpiredModal />
  <CompleteProfileModal />
</template>

<script setup lang="ts">
import SessionExpiredModal from './ui/components/SessionExpiredModal.vue';
import CompleteProfileModal from './ui/components/CompleteProfileModal.vue';
</script>

<style>
/* Estilos globales si son necesarios, el resto vendrá de Bootstrap */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
</style>

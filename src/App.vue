<template>
  <router-view />
  <ThemeToggle />
  <LocaleToggle />
  <AppToastViewport />
  <SessionExpiredModal />
  <BackendUnavailableModal />
  <CompleteProfileModal />
</template>

<script setup lang="ts">
import SessionExpiredModal from './ui/components/SessionExpiredModal.vue';
import BackendUnavailableModal from './ui/components/BackendUnavailableModal.vue';
import CompleteProfileModal from './ui/components/CompleteProfileModal.vue';
import ThemeToggle from './ui/components/ThemeToggle.vue';
import LocaleToggle from './ui/components/LocaleToggle.vue';
import AppToastViewport from './ui/components/AppToastViewport.vue';
</script>


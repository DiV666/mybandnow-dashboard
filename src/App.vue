<template>
  <router-view />
  <ThemeToggle />
  <SessionExpiredModal />
  <BackendUnavailableModal />
  <CompleteProfileModal />
</template>

<script setup lang="ts">
import SessionExpiredModal from './ui/components/SessionExpiredModal.vue';
import BackendUnavailableModal from './ui/components/BackendUnavailableModal.vue';
import CompleteProfileModal from './ui/components/CompleteProfileModal.vue';
import ThemeToggle from './ui/components/ThemeToggle.vue';
</script>


<template>
  <router-view />
  <AppToastViewport />
  <SessionExpiredModal />
  <BackendUnavailableModal />
  <CompleteProfileModal />
</template>

<script setup lang="ts">
import SessionExpiredModal from './ui/components/SessionExpiredModal.vue';
import BackendUnavailableModal from './ui/components/BackendUnavailableModal.vue';
import CompleteProfileModal from './ui/components/CompleteProfileModal.vue';
import AppToastViewport from './ui/components/AppToastViewport.vue';
</script>


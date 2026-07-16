<template>
  <router-view />
  <ThemeToggle />
  <SessionExpiredModal />
  <CompleteProfileModal />
</template>

<script setup lang="ts">
import SessionExpiredModal from './ui/components/SessionExpiredModal.vue';
import CompleteProfileModal from './ui/components/CompleteProfileModal.vue';
import ThemeToggle from './ui/components/ThemeToggle.vue';
</script>


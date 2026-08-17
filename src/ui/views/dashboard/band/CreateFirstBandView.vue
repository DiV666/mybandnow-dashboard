<script setup lang="ts">
import { ref } from 'vue';
import CreateBandModal from '../../../components/CreateBandModal.vue';

const isCreateBandModalOpen = ref(false);

function handleShowCreateBandForm() {
  isCreateBandModalOpen.value = true;
}

function handleCloseCreateBandModal() {
  isCreateBandModalOpen.value = false;
}
</script>

<template>
  <div class="row justify-content-center mt-5">
    <div class="col-md-8 col-lg-6">
      <div class="card shadow-sm border-primary">
        <div class="card-body p-5 text-center">
          <h1 class="h2 mb-3">{{ $t('views.createFirstBand.title') }}</h1>
          <p class="text-body-secondary mb-4">
            {{ $t('views.createFirstBand.description') }} <br>
            {{ $t('views.createFirstBand.descriptionLine2') }}
          </p>

          <div class="d-grid gap-3">
            <button
              type="button"
              class="btn btn-primary"
              @click="handleShowCreateBandForm"
            >
              {{ $t('views.createFirstBand.createBand') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <CreateBandModal :open="isCreateBandModalOpen" @close="handleCloseCreateBandModal" />
</template>

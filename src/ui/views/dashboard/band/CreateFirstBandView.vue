<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { container } from '../../../bootstrap/container.js';
import { useBandStore } from '../../../stores/useBandStore.js';
import { useToastStore } from '../../../stores/useToastStore.js';
import { isHttpErrorLike } from '../../../utils/httpError.js';

const { t } = useI18n();
const router = useRouter();
const bandStore = useBandStore();
const toastStore = useToastStore();
const bandName = ref('');
const isLoading = ref(false);
const showCreateBandForm = ref(false);

const { createBandUseCase } = container.useCases;

async function handleCreateBand() {
  if (!bandName.value.trim()) {
    toastStore.error(t('views.createFirstBand.errors.emptyName'));
    return;
  }

  isLoading.value = true;

  try {
    const newBandId = crypto.randomUUID();
    await createBandUseCase.run(newBandId, bandName.value);

    // The dashboard shell already mounted, so we force a refresh to reload bands.
    window.location.href = '/dashboard';
  } catch (error: unknown) {
    if (isHttpErrorLike(error) && error.response?.status === 409) {
      toastStore.error(t('views.createFirstBand.errors.conflict'));
    } else {
      toastStore.error(t('views.createFirstBand.errors.unexpected'));
    }
  } finally {
    isLoading.value = false;
  }
}

function handleSkipForNow() {
  bandStore.skipBandOnboarding();
  router.push({ name: 'SongsManager' });
}

function handleShowCreateBandForm() {
  showCreateBandForm.value = true;
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
              v-if="!showCreateBandForm"
              type="button"
              class="btn btn-primary"
              @click="handleShowCreateBandForm"
            >
              {{ $t('views.createFirstBand.createBand') }}
            </button>

            <form v-if="showCreateBandForm" @submit.prevent="handleCreateBand">
              <div class="mb-4 text-start">
                <label for="bandName" class="form-label fw-bold">{{ $t('views.createFirstBand.bandNameLabel') }}</label>
                <input
                  type="text"
                  class="form-control"
                  id="bandName"
                  v-model="bandName"
                  :placeholder="$t('views.createFirstBand.bandNamePlaceholder')"
                  required
                >
              </div>

              <button
                type="submit"
                class="btn btn-primary w-100"
                :disabled="isLoading"
              >
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ isLoading ? $t('views.createFirstBand.submitLoading') : $t('views.createFirstBand.submit') }}
              </button>
            </form>

            <button
              type="button"
              class="btn btn-link"
              :disabled="isLoading"
              @click="handleSkipForNow"
            >
              {{ $t('views.createFirstBand.skip') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

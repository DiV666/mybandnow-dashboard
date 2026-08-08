<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { AuthToken } from "../../../domain/auth/value-object/AuthToken.js";
import { useAuthStore } from "../../stores/useAuthStore.js";
import { useMusicianStore } from "../../stores/useMusicianStore.js";
import { useToastStore } from "../../stores/useToastStore.js";

interface JwtPayload {
	email?: string;
}

const authStore = useAuthStore();
const musicianStore = useMusicianStore();
const toastStore = useToastStore();

const isInitialLoadPending = ref(true);

function getEmailFromSessionToken(): string | null {
	if (!authStore.token) {
		return null;
	}

	try {
		const authToken = new AuthToken(authStore.token);
		authToken.getExpirationTimeMs();

		const [, payloadSegment] = authStore.token.split(".");
		if (!payloadSegment) {
			return null;
		}

		const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
		const payload = JSON.parse(atob(base64)) as JwtPayload;
		return typeof payload.email === "string" && payload.email.length > 0
			? payload.email
			: null;
	} catch {
		return null;
	}
}

const sessionEmail = computed(() => getEmailFromSessionToken());

async function loadProfile(): Promise<void> {
	isInitialLoadPending.value = true;

	await musicianStore.fetchProfile();

	if (musicianStore.error) {
		toastStore.error(musicianStore.error);
	} else if (!musicianStore.profile) {
		await musicianStore.requireProfileCompletion();
	}

	isInitialLoadPending.value = false;
}

onMounted(() => {
	void loadProfile();
});
</script>

<template>
  <section class="profile-view container-fluid px-0">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
      <div>
        <h1 class="h2 mb-1">{{ $t('views.profile.title') }}</h1>
        <p class="text-body-secondary mb-0">
          {{ $t('views.profile.description') }}
        </p>
      </div>
    </div>

    <div v-if="isInitialLoadPending" class="card shadow-sm border-0 rounded-4">
      <div class="card-body d-flex align-items-center gap-3 py-4">
        <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
        <p class="mb-0 text-body-secondary">{{ $t('views.profile.loading') }}</p>
      </div>
    </div>

    <div v-else-if="musicianStore.profile" class="row g-4">
      <div class="col-12 col-xl-8">
        <article class="card shadow-sm border-0 rounded-4 h-100">
          <div class="card-body p-4">
            <span class="badge text-bg-primary-subtle text-primary-emphasis rounded-pill mb-3">
              {{ $t('views.profile.activeBadge') }}
            </span>
            <h2 class="h4 mb-1">{{ musicianStore.profile.name }}</h2>
            <p class="text-body-secondary fs-5 mb-4">@{{ musicianStore.profile.username }}</p>

            <dl class="row mb-0 g-3">
              <div class="col-sm-6">
                <dt class="small text-uppercase text-body-secondary mb-1">{{ $t('views.profile.artisticName') }}</dt>
                <dd class="mb-0 fw-semibold">{{ musicianStore.profile.name }}</dd>
              </div>
              <div class="col-sm-6">
                <dt class="small text-uppercase text-body-secondary mb-1">{{ $t('views.profile.email') }}</dt>
                <dd class="mb-0 fw-semibold">{{ sessionEmail ?? $t('views.profile.emailUnavailable') }}</dd>
              </div>
            </dl>
          </div>
        </article>
      </div>

      <div class="col-12 col-xl-4">
        <aside class="card shadow-sm border-0 rounded-4 h-100">
          <div class="card-body p-4">
            <h2 class="h6 text-uppercase text-body-secondary mb-3">{{ $t('views.profile.technicalData') }}</h2>
            <dl class="mb-0 d-grid gap-3">
              <div>
                <dt class="small text-uppercase text-body-secondary mb-1">{{ $t('views.profile.musicianId') }}</dt>
                <dd class="mb-0 font-monospace small">{{ musicianStore.profile.id }}</dd>
              </div>
              <div>
                <dt class="small text-uppercase text-body-secondary mb-1">{{ $t('views.profile.userId') }}</dt>
                <dd class="mb-0 font-monospace small">{{ musicianStore.profile.userId }}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>

    <div v-else class="card shadow-sm border-0 rounded-4">
      <div class="card-body py-4">
        <p class="mb-0 text-body-secondary">
          {{ $t('views.profile.incomplete') }}
        </p>
      </div>
    </div>
  </section>
</template>

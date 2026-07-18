<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useBandStore } from '../stores/useBandStore.js';
import { useMusicianStore } from '../stores/useMusicianStore.js';
import { GetMyBandsUseCase } from '../../application/band/GetMyBandsUseCase.js';
import { AxiosBandRepository } from '../../infrastructure/band/AxiosBandRepository.js';

const router = useRouter();
const authStore = useAuthStore();
const bandStore = useBandStore();
const musicianStore = useMusicianStore();

const bandRepository = new AxiosBandRepository();
const getMyBandsUseCase = new GetMyBandsUseCase(bandRepository);

const isLoading = ref(true);
const shouldShowBandShell = computed(() => bandStore.hasBands || Boolean(bandStore.selectedBandId));

onMounted(async () => {
  try {
    await musicianStore.fetchProfile();
    const bands = await getMyBandsUseCase.run();
    bandStore.setBands(bands);

    if (bandStore.shouldRedirectToCreateFirstBand) {
      router.push({ name: 'CreateFirstBand' });
    }
  } catch (error) {
    console.error('Error fetching bands', error);
  } finally {
    isLoading.value = false;
  }
});

const goToCreateFirstBand = () => {
  router.push({ name: 'CreateFirstBand' });
};

const logout = () => {
  authStore.logout();
  bandStore.clear();
  musicianStore.clear();
  router.push({ name: 'Landing' });
};
</script>

<template>
  <div v-if="isLoading" class="dashboard-loading d-flex justify-content-center align-items-center">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Cargando...</span>
    </div>
  </div>

  <div v-else class="dashboard-layout container-fluid d-flex flex-column p-0">
    <!-- Navbar superior -->
    <header class="navbar dashboard-topbar flex-md-nowrap px-3 py-2 shadow-sm gap-3">
      <a class="navbar-brand dashboard-brand me-0 px-0" href="#">Mybandnow Admin</a>
      
      <!-- Selector de Banda (AWS Region style) -->
      <div v-if="bandStore.hasBands" class="w-100 d-flex align-items-center gap-2 flex-wrap">
        <label for="band-selector" class="dashboard-label text-nowrap mb-0">Banda Activa:</label>
        <select 
          id="band-selector"
          class="form-select form-select-sm w-auto dashboard-band-select"
          v-model="bandStore.selectedBandId"
        >
          <option v-for="band in bandStore.bands" :key="band.id.value" :value="band.id.value">
            {{ band.name.value }}
          </option>
        </select>
      </div>
      <div v-else-if="!shouldShowBandShell" class="w-100 d-flex align-items-center">
        <button
          type="button"
          class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
          @click="goToCreateFirstBand"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-plus-circle"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1m0 1a6 6 0 1 0 0 12A6 6 0 0 0 8 2" />
            <path d="M8 4.5a.5.5 0 0 1 .5.5v2.5H11a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V8.5H5a.5.5 0 0 1 0-1h2.5V5a.5.5 0 0 1 .5-.5" />
          </svg>
          <span>Crear banda</span>
        </button>
      </div>

      <button class="navbar-toggler position-absolute d-md-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sidebarMenu">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="navbar-nav dashboard-user-nav d-flex flex-row align-items-center ms-auto">
        <div class="nav-item text-nowrap px-3" v-if="musicianStore.profile">
          Bienvenido, <strong>{{ musicianStore.profile.name || musicianStore.profile.username }}</strong>
        </div>
        <div class="nav-item text-nowrap">
          <a class="nav-link px-3" href="#" @click.prevent="logout">Cerrar Sesión</a>
        </div>
      </div>
    </header>

    <div class="row flex-grow-1 m-0">
      <!-- Sidebar lateral (oculto si no hay banda seleccionada) -->
      <nav v-if="shouldShowBandShell" id="sidebarMenu" class="col-md-3 col-lg-2 d-md-block dashboard-sidebar sidebar collapse">
        <div class="position-sticky pt-3">
          <ul class="nav flex-column gap-1 px-2 pb-3">
            <li class="nav-item">
              <router-link :to="{ name: 'DashboardHome' }" class="nav-link dashboard-nav-link" active-class="active fw-bold text-primary">
                Inicio
              </router-link>
            </li>
            <li class="nav-item">
              <router-link :to="{ name: 'MembersManager' }" class="nav-link dashboard-nav-link" active-class="active fw-bold text-primary">
                Músicos
              </router-link>
            </li>
            <li class="nav-item">
              <router-link :to="{ name: 'SongsManager' }" class="nav-link dashboard-nav-link" active-class="active fw-bold text-primary">
                Canciones
              </router-link>
            </li>
            <li class="nav-item">
              <router-link :to="{ name: 'VideoclipsManager' }" class="nav-link dashboard-nav-link" active-class="active fw-bold text-primary">
                Videoclips
              </router-link>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Área principal dinámica -->
      <main :class="['dashboard-main py-4', shouldShowBandShell ? 'col-md-9 ms-sm-auto col-lg-10 px-md-4' : 'col-12 px-4 px-lg-5']">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.dashboard-loading,
.dashboard-layout {
  min-height: 100vh;
}

.dashboard-topbar {
  background: color-mix(in srgb, var(--bs-body-bg) 74%, var(--rock-surface-container));
  border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.08);
  backdrop-filter: blur(16px);
}

.dashboard-brand {
  color: var(--bs-heading-color);
  font-family: var(--rock-heading-font-family);
  letter-spacing: 0.04em;
}

.dashboard-label,
.dashboard-user-nav {
  color: var(--bs-body-color);
}

.dashboard-user-nav {
  gap: 0.25rem;
  flex-wrap: wrap;
}

.dashboard-band-select {
  min-width: min(100%, 15rem);
}

.sidebar {
  min-height: calc(100vh - 76px);
}

.dashboard-sidebar {
  border-right: 1px solid rgba(var(--bs-primary-rgb), 0.08);
}

.dashboard-nav-link {
  padding: 0.75rem 1rem;
  border-radius: var(--bs-border-radius-pill);
  color: var(--bs-body-color);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.dashboard-nav-link:hover {
  background-color: rgba(var(--bs-primary-rgb), 0.06);
  transform: translateX(2px);
}

.dashboard-nav-link.active {
  background-color: rgba(var(--bs-primary-rgb), 0.12);
}

.dashboard-user-nav .nav-link {
  color: var(--bs-body-color);
}

@media (max-width: 767.98px) {
  .dashboard-topbar {
    align-items: flex-start;
    padding-block: 1rem;
  }

  .dashboard-user-nav {
    width: 100%;
    justify-content: space-between;
    margin-left: 0 !important;
  }
}
</style>

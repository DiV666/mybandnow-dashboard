<script setup lang="ts">
import { ref, onMounted } from 'vue';
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

onMounted(async () => {
  try {
    await musicianStore.fetchProfile();
    const bands = await getMyBandsUseCase.run();
    bandStore.setBands(bands);
    
    if (!bandStore.hasBands) {
      router.push({ name: 'CreateFirstBand' });
    }
  } catch (error) {
    console.error('Error fetching bands', error);
  } finally {
    isLoading.value = false;
  }
});

const logout = () => {
  authStore.logout();
  bandStore.clear();
  musicianStore.clear();
  router.push({ name: 'Landing' });
};
</script>

<template>
  <div v-if="isLoading" class="d-flex justify-content-center align-items-center min-vh-100">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Cargando...</span>
    </div>
  </div>

  <div v-else class="container-fluid min-vh-100 d-flex flex-column p-0">
    <!-- Navbar superior -->
    <header class="navbar navbar-dark bg-dark flex-md-nowrap p-0 shadow">
      <a class="navbar-brand col-md-3 col-lg-2 me-0 px-3" href="#">Mybandnow Admin</a>
      
      <!-- Selector de Banda (AWS Region style) -->
      <div v-if="bandStore.hasBands" class="w-100 px-3 d-flex align-items-center">
        <label for="band-selector" class="text-white me-2 text-nowrap">Banda Activa:</label>
        <select 
          id="band-selector"
          class="form-select form-select-sm w-auto bg-dark text-white border-secondary"
          v-model="bandStore.selectedBandId"
        >
          <option v-for="band in bandStore.bands" :key="band.id.value" :value="band.id.value">
            {{ band.name.value }}
          </option>
        </select>
      </div>
      <div v-else class="w-100"></div>

      <button class="navbar-toggler position-absolute d-md-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sidebarMenu">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="navbar-nav d-flex flex-row align-items-center">
        <div class="nav-item text-nowrap text-light px-3" v-if="musicianStore.profile">
          Bienvenido, <strong>{{ musicianStore.profile.name || musicianStore.profile.username }}</strong>
        </div>
        <div class="nav-item text-nowrap">
          <a class="nav-link px-3" href="#" @click.prevent="logout">Cerrar Sesión</a>
        </div>
      </div>
    </header>

    <div class="row flex-grow-1 m-0">
      <!-- Sidebar lateral (oculto si no hay banda seleccionada) -->
      <nav v-if="bandStore.hasBands" id="sidebarMenu" class="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse">
        <div class="position-sticky pt-3">
          <ul class="nav flex-column">
            <li class="nav-item">
              <router-link :to="{ name: 'DashboardHome' }" class="nav-link text-dark" active-class="active fw-bold text-primary">
                Inicio
              </router-link>
            </li>
            <li class="nav-item">
              <router-link :to="{ name: 'MembersManager' }" class="nav-link text-dark" active-class="active fw-bold text-primary">
                Músicos
              </router-link>
            </li>
            <li class="nav-item">
              <router-link :to="{ name: 'SongsManager' }" class="nav-link text-dark" active-class="active fw-bold text-primary">
                Canciones
              </router-link>
            </li>
            <li class="nav-item">
              <router-link :to="{ name: 'VideoclipsManager' }" class="nav-link text-dark" active-class="active fw-bold text-primary">
                Videoclips
              </router-link>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Área principal dinámica -->
      <main :class="['py-4', bandStore.hasBands ? 'col-md-9 ms-sm-auto col-lg-10 px-md-4' : 'col-12 px-5']">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  min-height: calc(100vh - 48px);
  border-right: 1px solid #dee2e6;
}
.nav-link.active {
  background-color: rgba(13, 110, 253, 0.1);
}
</style>

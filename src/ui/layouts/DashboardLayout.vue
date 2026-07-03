<template>
  <div class="container-fluid min-vh-100 d-flex flex-column p-0">
    <!-- Navbar superior -->
    <header class="navbar navbar-dark bg-dark flex-md-nowrap p-0 shadow">
      <a class="navbar-brand col-md-3 col-lg-2 me-0 px-3" href="#">Mybandnow Admin</a>
      <button class="navbar-toggler position-absolute d-md-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sidebarMenu" aria-controls="sidebarMenu" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="w-100"></div>
      <div class="navbar-nav">
        <div class="nav-item text-nowrap">
          <a class="nav-link px-3" href="#" @click.prevent="logout">Cerrar Sesión</a>
        </div>
      </div>
    </header>

    <div class="row flex-grow-1 m-0">
      <!-- Sidebar lateral -->
      <nav id="sidebarMenu" class="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse">
        <div class="position-sticky pt-3">
          <ul class="nav flex-column">
            <li class="nav-item">
              <router-link :to="{ name: 'DashboardHome' }" class="nav-link text-dark" active-class="active fw-bold text-primary">
                Inicio
              </router-link>
            </li>
            <li class="nav-item">
              <router-link :to="{ name: 'BandsManager' }" class="nav-link text-dark" active-class="active fw-bold text-primary">
                Grupos
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
      <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const logout = () => {
  // TODO: Limpiar estado global / localstorage
  console.log('Cerrando sesión...');
  router.push({ name: 'Landing' });
};
</script>

<style scoped>
.sidebar {
  min-height: calc(100vh - 48px);
  border-right: 1px solid #dee2e6;
}
.nav-link.active {
  background-color: rgba(13, 110, 253, 0.1);
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { GetMyBandsUseCase } from '../../application/band/GetMyBandsUseCase.js';
import { AxiosBandRepository } from '../../infrastructure/band/AxiosBandRepository.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useBandStore } from '../stores/useBandStore.js';
import { useMusicianStore } from '../stores/useMusicianStore.js';
import bandLogoPlaceholder from '../../assets/band-logo-placeholder.png';
import LocaleToggle from "../components/LocaleToggle.vue";
import ThemeToggle from "../components/ThemeToggle.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const bandStore = useBandStore();
const musicianStore = useMusicianStore();

const bandRepository = new AxiosBandRepository();
const getMyBandsUseCase = new GetMyBandsUseCase(bandRepository);

const isLoading = ref(true);
const isUserMenuOpen = ref(false);
const isBandMenuOpen = ref(false);
const userMenuContainer = ref<HTMLElement | null>(null);
const bandMenuContainer = ref<HTMLElement | null>(null);

const shouldShowBandShell = computed(
  () => bandStore.hasBands || Boolean(bandStore.selectedBandId),
);
const selectedBandName = computed(
  () => bandStore.selectedBand?.name.value ?? 'Seleccionar banda',
);

type MaybeContainedTarget = EventTarget & {
  parentNode?: MaybeContainedTarget | null;
};

const closeAllMenus = () => {
  isUserMenuOpen.value = false;
  isBandMenuOpen.value = false;
};

const isNodeWithinContainer = (
  target: EventTarget | null,
  container: HTMLElement | null,
): boolean => {
  if (!target || !container) {
    return false;
  }

  if (typeof container.contains === 'function' && container.contains(target as Node)) {
    return true;
  }

  let currentTarget: MaybeContainedTarget | null = target as MaybeContainedTarget;

  while (currentTarget) {
    if (currentTarget === container) {
      return true;
    }

    currentTarget = currentTarget.parentNode ?? null;
  }

  return false;
};

const handleDocumentClick = (event: MouseEvent) => {
  const clickedUserMenu = isNodeWithinContainer(event.target, userMenuContainer.value);
  const clickedBandMenu = isNodeWithinContainer(event.target, bandMenuContainer.value);

  if (!clickedUserMenu) {
    isUserMenuOpen.value = false;
  }

  if (!clickedBandMenu) {
    isBandMenuOpen.value = false;
  }
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeAllMenus();
  }
};

const goToCreateFirstBand = () => {
  router.push({ name: 'CreateFirstBand' });
};

const toggleUserMenu = () => {
  const nextIsOpen = !isUserMenuOpen.value;
  isUserMenuOpen.value = nextIsOpen;

  if (nextIsOpen) {
    isBandMenuOpen.value = false;
  }
};

const toggleBandMenu = () => {
  const nextIsOpen = !isBandMenuOpen.value;
  isBandMenuOpen.value = nextIsOpen;

  if (nextIsOpen) {
    isUserMenuOpen.value = false;
  }
};

const goToProfile = () => {
  isUserMenuOpen.value = false;
  router.push({ name: 'Profile' });
};

const selectBand = (bandId: string) => {
  bandStore.selectBand(bandId);
  isBandMenuOpen.value = false;
};

const logout = () => {
  isUserMenuOpen.value = false;
  authStore.logout();
  bandStore.clear();
  musicianStore.clear();
  router.push({ name: 'Landing' });
};

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);

  try {
    await musicianStore.fetchProfile();

    try {
      const bands = await getMyBandsUseCase.run();
      bandStore.setBands(bands);
    } catch (error) {
      console.error('Error fetching bands', error);
      bandStore.setBands([]);
    }

    if (bandStore.shouldRedirectToCreateFirstBand) {
      router.push({ name: 'CreateFirstBand' });
    }
  } finally {
    isLoading.value = false;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeydown);
});
</script>

<template>
  <div v-if="isLoading" class="dashboard-loading d-flex justify-content-center align-items-center">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Cargando...</span>
    </div>
  </div>

  <div v-else class="dashboard-layout container-fluid d-flex flex-column p-0">
    <header class="navbar dashboard-topbar px-3 py-2 shadow-sm gap-3">
      <!-- Mobile Brand Area -->
      <div class="d-flex w-100 align-items-center justify-content-between d-md-none">
        <button
          class="navbar-toggler border-0 px-1"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#sidebarMenu"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <a class="navbar-brand dashboard-brand m-0 p-0" href="#">Mybandnow Admin</a>
      </div>

      <!-- Desktop Brand -->
      <a class="navbar-brand dashboard-brand me-0 px-0 d-none d-md-block" href="#">Mybandnow Admin</a>

      <div
        v-if="bandStore.hasBands"
        ref="bandMenuContainer"
        class="dashboard-topbar__center d-none d-md-flex"
      >
        <div class="dashboard-band-switcher d-flex align-items-center justify-content-center gap-2 flex-wrap">
          <span class="dashboard-label text-nowrap mb-0">Banda Activa:</span>

          <div class="dashboard-band-dropdown position-relative">
            <button
              type="button"
              class="btn dashboard-header-dropdown-toggle d-inline-flex align-items-center justify-content-between gap-2"
              data-testid="band-switcher-toggle"
              :aria-expanded="isBandMenuOpen"
              aria-haspopup="true"
              @click="toggleBandMenu"
            >
              <span class="dashboard-band-toggle__label text-truncate">{{ selectedBandName }}</span>
              <span aria-hidden="true" class="dashboard-dropdown-icon">▾</span>
            </button>

            <div
              v-if="isBandMenuOpen"
              class="dropdown-menu show dashboard-header-dropdown-menu dashboard-header-dropdown-panel"
            >
              <button
                v-for="band in bandStore.bands"
                :key="band.id.value"
                type="button"
                class="dropdown-item dashboard-band-option"
                data-band-option="true"
                :class="{ active: band.id.value === bandStore.selectedBandId, 'dashboard-band-option--active': band.id.value === bandStore.selectedBandId }"
                @click="selectBand(band.id.value)"
              >
                <span class="text-truncate">{{ band.name.value }}</span>
                <span v-if="band.id.value === bandStore.selectedBandId" aria-hidden="true">✓</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="!shouldShowBandShell"
        class="dashboard-topbar__center dashboard-topbar__center--fallback d-none d-md-flex"
      >
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

      <div
        ref="userMenuContainer"
        class="navbar-nav dashboard-user-nav dashboard-topbar__end d-none d-md-flex flex-row align-items-center"
      >
        <div class="nav-item text-nowrap position-relative dashboard-user-dropdown">
          <button
            type="button"
            class="btn nav-link px-3 d-inline-flex align-items-center gap-2 text-decoration-none dashboard-header-dropdown-toggle dashboard-user-toggle"
            :aria-expanded="isUserMenuOpen"
            aria-haspopup="true"
            @click="toggleUserMenu"
          >
            <span v-if="musicianStore.profile">
              <strong>Bienvenido, </strong>{{ musicianStore.profile.name || musicianStore.profile.username }}
            </span>
            <span v-else>Mi cuenta</span>
            <span aria-hidden="true" class="dashboard-dropdown-icon">▾</span>
          </button>

          <div
            v-if="isUserMenuOpen"
            class="dropdown-menu dropdown-menu-end show dashboard-header-dropdown-menu dashboard-header-dropdown-panel dashboard-user-menu"
          >
            <button type="button" class="dropdown-item d-flex align-items-center gap-2" @click="goToProfile">
              <i class="bi bi-person" aria-hidden="true"></i>
              <span>Mi Perfil</span>
            </button>
            <button type="button" class="dropdown-item d-flex align-items-center gap-2 text-danger-emphasis" @click="logout">
              <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="row flex-grow-1 m-0 dashboard-body">
      <nav
        v-if="shouldShowBandShell"
        id="sidebarMenu"
        class="col-md-3 col-lg-2 d-md-block dashboard-sidebar sidebar offcanvas-md offcanvas-start"
        tabindex="-1"
      >
        <div class="offcanvas-header d-md-none border-bottom border-secondary-subtle">
          <h5 class="offcanvas-title font-monospace fw-bold m-0" style="font-family: var(--rock-heading-font-family) !important;">Menú</h5>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body d-flex flex-column p-0 p-md-3 h-100">
          <!-- Mobile Band Switcher -->
          <div v-if="bandStore.hasBands" class="d-md-none p-3 border-bottom border-secondary-subtle bg-body-tertiary">
            <span class="d-block text-muted small mb-2 fw-semibold text-uppercase" style="letter-spacing: 0.05em;">Banda Activa</span>
            <div class="d-flex flex-column gap-2">
                <button
                v-for="band in bandStore.bands"
                :key="band.id.value"
                type="button"
                class="btn btn-sm text-start fw-medium"
                :class="band.id.value === bandStore.selectedBandId ? 'btn-primary' : 'btn-outline-secondary'"
                data-bs-dismiss="offcanvas"
                data-bs-target="#sidebarMenu"
                @click="selectBand(band.id.value)"
              >
                {{ band.name.value }}
                <span v-if="band.id.value === bandStore.selectedBandId" class="float-end" aria-hidden="true">✓</span>
              </button>
            </div>
          </div>
          <div v-else-if="!shouldShowBandShell" class="d-md-none p-3 border-bottom border-secondary-subtle">
            <button
              type="button"
              class="btn btn-primary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-2"
              data-bs-dismiss="offcanvas"
              data-bs-target="#sidebarMenu"
              @click="goToCreateFirstBand"
            >
              <i class="bi bi-plus-circle" aria-hidden="true"></i>
              <span>Crear banda</span>
            </button>
          </div>

          <!-- Mobile User Menu -->
          <div class="d-md-none p-3 border-bottom border-secondary-subtle bg-body-tertiary mb-3">
            <span class="d-block text-muted small mb-2 fw-semibold text-uppercase" style="letter-spacing: 0.05em;">
              <span v-if="musicianStore.profile">{{ musicianStore.profile.name || musicianStore.profile.username }}</span>
              <span v-else>Mi cuenta</span>
            </span>
            <div class="d-flex flex-column gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary text-start d-flex align-items-center gap-2" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu" @click="goToProfile">
                <i class="bi bi-person" aria-hidden="true"></i> Mi Perfil
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger text-start d-flex align-items-center gap-2" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu" @click="logout">
                <i class="bi bi-box-arrow-right" aria-hidden="true"></i> Cerrar sesión
              </button>
            </div>
          </div>

          <div class="card dashboard-sidebar-card overflow-hidden mx-3 mx-md-0">
            <div class="card-body p-3 text-center">
              <div class="dashboard-band-logo-wrapper mb-3 mx-auto">
                <img
                  :src="bandLogoPlaceholder"
                  alt="Logo de la banda"
                  class="dashboard-band-logo img-fluid rounded-3"
                >
              </div>

              <h6 class="dashboard-sidebar-band-name text-truncate mb-0" :title="selectedBandName">
                {{ selectedBandName }}
              </h6>
            </div>

            <hr class="my-0 dashboard-sidebar-divider">

            <div class="card-body p-2">
              <ul class="nav nav-pills flex-column gap-1 dashboard-sidebar-nav">
                <li class="nav-item">
                  <router-link
                    :to="{ name: 'SongsManager' }"
                    class="nav-link d-flex align-items-center gap-2 rounded-0 px-3 py-2 dashboard-sidebar-link"
                    active-class="active fw-semibold dashboard-sidebar-link--active"
                    data-bs-dismiss="offcanvas"
                    data-bs-target="#sidebarMenu"
                  >
                    <i class="bi bi-music-note-list dashboard-sidebar-link__icon" aria-hidden="true"></i>
                    <span>Canciones</span>
                  </router-link>
                </li>
                <li class="nav-item">
                  <router-link
                    :to="{ name: 'MembersManager' }"
                    class="nav-link d-flex align-items-center gap-2 rounded-0 px-3 py-2 dashboard-sidebar-link"
                    active-class="active fw-semibold dashboard-sidebar-link--active"
                    data-bs-dismiss="offcanvas"
                    data-bs-target="#sidebarMenu"
                  >
                    <i class="bi bi-people dashboard-sidebar-link__icon" aria-hidden="true"></i>
                    <span>Miembros</span>
                  </router-link>
                </li>
                <li class="nav-item">
                  <router-link
                    :to="{ name: 'VideoclipsManager' }"
                    class="nav-link d-flex align-items-center gap-2 rounded-0 px-3 py-2 dashboard-sidebar-link"
                    active-class="active fw-semibold dashboard-sidebar-link--active"
                    data-bs-dismiss="offcanvas"
                    data-bs-target="#sidebarMenu"
                  >
                    <i class="bi bi-camera-video dashboard-sidebar-link__icon" aria-hidden="true"></i>
                    <span>Videoclips</span>
                  </router-link>
                </li>
              </ul>
            </div>
          </div>

          <div class="card dashboard-sidebar-card mx-3 mx-md-0 mt-auto mb-3 mb-md-0 flex-shrink-0">
            <div class="card-body p-3 d-flex flex-column align-items-center gap-3">
              <div class="d-flex align-items-center justify-content-center gap-3 w-100">
                <LocaleToggle :floating="false" />
                <ThemeToggle :floating="false" />
              </div>
              <div class="text-center text-muted lh-sm" style="font-size: 0.7rem;">
                &copy; {{ new Date().getFullYear() }} My Band Now.<br>Todos los derechos reservados.
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main
        :class="[
          'dashboard-main py-4',
          shouldShowBandShell ? 'col-md-9 ms-sm-auto col-lg-10 px-md-4' : 'col-12 px-4 px-lg-5',
        ]"
      >
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
  position: relative;
  z-index: var(--rock-z-dashboard-topbar);
  isolation: isolate;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  background: var(--rock-surface-container);
  border-bottom: 1px solid var(--rock-surface-border);
  backdrop-filter: blur(16px);
}

.dashboard-topbar__center {
  display: flex;
  justify-content: center;
  min-width: 0;
}

.dashboard-topbar__center--fallback {
  justify-content: center;
}

.dashboard-topbar__end {
  justify-self: end;
}

.dashboard-band-switcher {
  width: min(100%, 26rem);
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

.dashboard-band-dropdown {
  width: min(100%, 16rem);
}

.dashboard-header-dropdown-toggle {
  min-height: 2.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--bs-body-color);
  transform: none;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
  will-change: auto;
}

.dashboard-header-dropdown-toggle:hover,
.dashboard-header-dropdown-toggle:focus,
.dashboard-header-dropdown-toggle:focus-visible,
.dashboard-header-dropdown-toggle:active {
  background: rgba(var(--bs-primary-rgb), 0.06);
  color: var(--bs-body-color);
  transform: none;
}

[data-bs-theme="dark"] .dashboard-header-dropdown-toggle:hover,
[data-bs-theme="dark"] .dashboard-header-dropdown-toggle:focus,
[data-bs-theme="dark"] .dashboard-header-dropdown-toggle:focus-visible,
[data-bs-theme="dark"] .dashboard-header-dropdown-toggle:active {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.dashboard-band-dropdown .dashboard-header-dropdown-toggle {
  width: 100%;
  padding: 0.5rem 0.875rem;
}

.dashboard-band-toggle__label {
  min-width: 0;
}

.dashboard-dropdown-icon,
.dashboard-band-toggle__icon {
  font-size: 0.75rem;
  line-height: 1;
  opacity: 0.8;
}

.dashboard-header-dropdown-menu {
  border-color: var(--bs-dropdown-border-color);
  border-radius: var(--bs-border-radius-lg);
  background-color: var(--bs-dropdown-bg);
  box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.dashboard-header-dropdown-panel {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  z-index: var(--rock-z-dashboard-dropdown);
  width: 100%;
  padding: 0.4rem;
}

.dashboard-band-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 0;
  border-radius: 0.75rem;
  color: var(--bs-body-color);
  text-align: left;
}

.dashboard-band-option:hover,
.dashboard-band-option:focus {
  background: var(--bs-dropdown-link-hover-bg);
  color: var(--bs-dropdown-link-hover-color);
}

.dashboard-band-option--active,
.dropdown-item.active,
.dropdown-item:active {
  background-color: var(--bs-dropdown-link-active-bg) !important;
  color: var(--bs-dropdown-link-active-color) !important;
  font-weight: 600;
}

.sidebar {
  min-height: calc(100vh - 76px);
}

.dashboard-sidebar {
  border-right: 1px solid var(--rock-surface-border);
}

.dashboard-sidebar-card {
  border: 1px solid var(--rock-surface-border);
  border-top: 3px solid var(--rock-accent-tertiary);
  background: var(--rock-surface-container);
  box-shadow: var(--rock-surface-shadow);
}

.dashboard-band-logo-wrapper {
  width: min(80%, 9.5rem);
  aspect-ratio: 1 / 1;
  padding: 0.35rem;
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid var(--rock-surface-border);
  background: color-mix(in srgb, var(--bs-body-bg) 60%, transparent);
}

.dashboard-band-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--bs-border-radius);
}

.dashboard-sidebar-band-name {
  font-family: var(--rock-heading-font-family);
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: var(--bs-heading-color);
  text-transform: uppercase;
}

.dashboard-sidebar-divider {
  border-color: var(--rock-surface-border);
  opacity: 0.8;
}

.dashboard-sidebar-nav {
  --bs-nav-pills-link-active-bg: rgba(var(--bs-primary-rgb), 0.12);
  --bs-nav-pills-link-active-color: var(--bs-heading-color);
}

.dashboard-sidebar-link {
  border-radius: 0.5rem;
  color: var(--bs-body-color);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.dashboard-sidebar-link--active {
  color: var(--bs-heading-color);
  box-shadow: inset 0 0 0 1px rgba(var(--bs-primary-rgb), 0.08);
}

.dashboard-sidebar-link:hover,
.dashboard-sidebar-link:focus-visible {
  background-color: rgba(var(--bs-primary-rgb), 0.06);
  color: var(--bs-heading-color);
  transform: translateX(2px);
}

[data-bs-theme="dark"] .dashboard-sidebar-nav {
  --bs-nav-pills-link-active-bg: rgba(255, 219, 60, 0.14);
  --bs-nav-pills-link-active-color: #ffdb3c;
}

[data-bs-theme="dark"] .dashboard-sidebar-link--active {
  color: #ffdb3c;
  box-shadow: inset 0 0 0 1px rgba(255, 219, 60, 0.3);
}

[data-bs-theme="dark"] .dashboard-sidebar-link:hover,
[data-bs-theme="dark"] .dashboard-sidebar-link:focus-visible {
  background-color: rgba(255, 219, 60, 0.08);
  color: #ffdb3c;
}

.dashboard-sidebar-link__icon {
  width: 1.125rem;
  font-size: 1rem;
  line-height: 1;
  text-align: center;
  opacity: 0.85;
}

.dashboard-sidebar-link.active .dashboard-sidebar-link__icon,
.dashboard-sidebar-link:hover .dashboard-sidebar-link__icon,
.dashboard-sidebar-link:focus-visible .dashboard-sidebar-link__icon {
  opacity: 1;
}

.dashboard-user-nav .nav-link {
  color: var(--bs-body-color);
}

.dashboard-user-toggle {
  background: transparent;
}

.dashboard-user-dropdown .dashboard-header-dropdown-panel {
  right: 0;
  left: auto;
  min-width: 12rem;
  width: max-content;
}

.dashboard-user-menu {
  inset: calc(100% + 0.25rem) 0 auto auto;
}

.dashboard-user-menu .dropdown-item {
  color: var(--bs-body-color);
  cursor: pointer;
}

.dashboard-user-menu .dropdown-item:hover,
.dashboard-user-menu .dropdown-item:focus {
  background-color: var(--bs-dropdown-link-hover-bg);
  color: var(--bs-dropdown-link-hover-color);
}

.dashboard-user-menu .dropdown-item:active,
.dashboard-user-menu .dropdown-item.active {
  background-color: var(--bs-dropdown-link-active-bg) !important;
  color: var(--bs-dropdown-link-active-color) !important;
}

@media (max-width: 767.98px) {
  .dashboard-topbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    padding-block: 1rem;
  }

  .dashboard-band-switcher,
  .dashboard-band-dropdown {
    width: 100%;
  }

  .dashboard-user-nav {
    width: 100%;
    justify-content: space-between;
    margin-left: 0 !important;
  }

  #sidebarMenu.offcanvas-md {
    max-width: 85vw;
    display: flex !important;
    flex-direction: column !important;
  }

  #sidebarMenu.offcanvas-md .offcanvas-body {
    flex: 1 1 auto !important;
    overflow-y: auto !important;
    height: 100% !important;
    max-height: calc(100vh - 60px); /* fallback to ensure it never exceeds screen minus header */
  }
}

@media (min-width: 768px) {
  .dashboard-layout {
    height: 100dvh;
    overflow: hidden;
  }

  .dashboard-body {
    height: 100%;
    overflow: hidden;
  }

  .dashboard-sidebar,
  .dashboard-main {
    height: 100%;
    overflow-y: auto;
  }
}
</style>

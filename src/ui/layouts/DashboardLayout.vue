<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { GetMyBandsUseCase } from '../../application/band/GetMyBandsUseCase.js';
import { AxiosBandRepository } from '../../infrastructure/band/AxiosBandRepository.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useBandStore } from '../stores/useBandStore.js';
import { useMusicianStore } from '../stores/useMusicianStore.js';

const router = useRouter();
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
      <a class="navbar-brand dashboard-brand me-0 px-0" href="#">Mybandnow Admin</a>

      <div
        v-if="bandStore.hasBands"
        ref="bandMenuContainer"
        class="dashboard-topbar__center"
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
              <span aria-hidden="true" class="dashboard-band-toggle__icon">▾</span>
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
                :class="{ 'dashboard-band-option--active': band.id.value === bandStore.selectedBandId }"
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
        class="dashboard-topbar__center dashboard-topbar__center--fallback"
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

      <button
        class="navbar-toggler position-absolute d-md-none collapsed"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#sidebarMenu"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div
        ref="userMenuContainer"
        class="navbar-nav dashboard-user-nav dashboard-topbar__end d-flex flex-row align-items-center"
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
            <span aria-hidden="true">▾</span>
          </button>

          <div
            v-if="isUserMenuOpen"
            class="dropdown-menu dropdown-menu-end show dashboard-header-dropdown-menu dashboard-header-dropdown-panel dashboard-user-menu"
          >
            <button type="button" class="dropdown-item" @click="goToProfile">Mi Perfil</button>
            <button type="button" class="dropdown-item" @click="logout">Cerrar sesión</button>
          </div>
        </div>
      </div>
    </header>

    <div class="row flex-grow-1 m-0">
      <nav
        v-if="shouldShowBandShell"
        id="sidebarMenu"
        class="col-md-3 col-lg-2 d-md-block dashboard-sidebar sidebar collapse"
      >
        <div class="position-sticky pt-3">
          <ul class="nav flex-column gap-1 px-2 pb-3">
            <li class="nav-item">
              <router-link
                :to="{ name: 'SongsManager' }"
                class="nav-link dashboard-nav-link"
                active-class="active fw-bold text-primary"
              >
                Canciones
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                :to="{ name: 'MembersManager' }"
                class="nav-link dashboard-nav-link"
                active-class="active fw-bold text-primary"
              >
                Miembros
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                :to="{ name: 'VideoclipsManager' }"
                class="nav-link dashboard-nav-link"
                active-class="active fw-bold text-primary"
              >
                Videoclips
              </router-link>
            </li>
          </ul>
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
  background: color-mix(in srgb, var(--bs-body-bg) 74%, var(--rock-surface-container));
  border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.08);
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

.dashboard-band-dropdown .dashboard-header-dropdown-toggle {
  width: 100%;
  padding: 0.5rem 0.875rem;
}

.dashboard-band-toggle__label {
  min-width: 0;
}

.dashboard-band-toggle__icon {
  font-size: 0.75rem;
}

.dashboard-header-dropdown-menu {
  border-color: rgba(var(--bs-primary-rgb), 0.12);
  border-radius: 1rem;
  background-color: var(--bs-body-bg);
  box-shadow: 0 0.75rem 1.5rem rgba(15, 23, 42, 0.1);
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
  background: rgba(var(--bs-primary-rgb), 0.08);
}

.dashboard-band-option--active {
  background: rgba(var(--bs-primary-rgb), 0.12);
  color: var(--bs-emphasis-color);
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
  background-color: rgba(var(--bs-primary-rgb), 0.08);
}

.dashboard-user-menu .dropdown-item:active {
  background-color: rgba(var(--bs-primary-rgb), 0.12);
  color: var(--bs-body-color);
}

@media (max-width: 767.98px) {
  .dashboard-topbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    padding-block: 1rem;
  }

  .dashboard-topbar__center,
  .dashboard-topbar__end {
    width: 100%;
    justify-content: flex-start;
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
}
</style>

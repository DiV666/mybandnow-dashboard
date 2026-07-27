<template>
  <div class="public-layout app-shell-glow">
    <nav class="navbar navbar-expand-lg public-navbar surface-container border-bottom shadow-sm">
      <div class="container public-navbar__inner">
        <router-link
          class="navbar-brand public-brand fw-bold text-body text-decoration-none"
          :to="{ name: 'Landing' }"
        >
          Mybandnow
        </router-link>

        <div class="public-navbar__actions">
          <button
            class="btn btn-outline-primary public-navbar__menu-toggle d-inline-flex d-lg-none"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#publicNavDrawer"
            aria-controls="publicNavDrawer"
            aria-label="Abrir navegación pública"
          >
            <span class="navbar-toggler-icon" aria-hidden="true"></span>
          </button>

          <router-link
            v-if="!isLoginRoute"
            class="btn btn-outline-primary public-navbar__cta d-none d-lg-inline-flex"
            :to="{ name: 'Login' }"
          >
            Iniciar sesión
          </router-link>
          <span
            v-else
            class="public-navbar__current d-none d-lg-inline-flex"
            aria-current="page"
          >
            Iniciar sesión
          </span>
        </div>
      </div>
    </nav>

    <div
      id="publicNavDrawer"
      ref="publicNavDrawer"
      class="offcanvas offcanvas-start public-offcanvas"
      tabindex="-1"
      aria-labelledby="publicNavDrawerLabel"
    >
      <div class="offcanvas-header public-offcanvas__header">
        <button
          id="publicNavDrawerLabel"
          type="button"
          class="navbar-brand public-brand public-offcanvas__brand text-body text-decoration-none mb-0"
          @click="navigateFromDrawer({ name: 'Landing' })"
        >
          Mybandnow
        </button>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label="Cerrar navegación"
        ></button>
      </div>

      <div class="offcanvas-body public-offcanvas__body">
        <nav class="nav flex-column public-offcanvas__nav" aria-label="Navegación pública móvil">
          <button
            type="button"
            class="public-offcanvas__link"
            :class="{ 'is-active': route.name === 'Landing' }"
            @click="navigateFromDrawer({ name: 'Landing' })"
          >
            Inicio
          </button>

          <button
            v-if="!isLoginRoute"
            type="button"
            class="public-offcanvas__link"
            @click="navigateFromDrawer({ name: 'Login' })"
          >
            Iniciar sesión
          </button>
          <span v-else class="public-offcanvas__link is-active" aria-current="page">
            Iniciar sesión
          </span>
        </nav>
      </div>
    </div>

    <main class="public-layout__content">
      <router-view />
    </main>

    <ThemeToggle />
    <LocaleToggle />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";
import ThemeToggle from "../components/ThemeToggle.vue";
import LocaleToggle from "../components/LocaleToggle.vue";

interface BootstrapOffcanvasInstance {
  hide(): void;
}

interface BootstrapOffcanvasApi {
  getOrCreateInstance(element: Element): BootstrapOffcanvasInstance;
}

interface BootstrapWindow {
  bootstrap?: {
    Offcanvas?: BootstrapOffcanvasApi;
  };
}

const route = useRoute();
const router = useRouter();
const publicNavDrawer = ref<HTMLElement | null>(null);
const isLoginRoute = computed(() => route.name === "Login");

async function navigateFromDrawer(target: RouteLocationRaw): Promise<void> {
  const offcanvasElement = publicNavDrawer.value;
  const bootstrapApi = (window as Window & BootstrapWindow).bootstrap?.Offcanvas;
  const offcanvas =
    offcanvasElement && bootstrapApi
      ? bootstrapApi.getOrCreateInstance(offcanvasElement)
      : null;

  offcanvas?.hide();
  await router.push(target);
}
</script>

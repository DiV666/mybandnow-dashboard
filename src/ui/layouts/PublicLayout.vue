<template>
  <div class="public-layout app-shell-glow d-flex flex-column flex-grow-1">
    <a href="#public-main-content" class="visually-hidden-focusable skip-link">{{ $t('common.skipToContent') }}</a>

    <nav
      class="navbar navbar-expand-md public-navbar surface-container border-bottom shadow-sm"
      :aria-label="$t('layouts.public.primaryNavLabel')"
    >
      <div class="container public-navbar__inner">
        <router-link
          class="navbar-brand public-brand fw-bold text-body text-decoration-none d-inline-flex align-items-center gap-2"
          :to="{ name: 'Landing' }"
        >
          <img src="/logo.png" alt="" class="public-brand__logo" aria-hidden="true">
          <span>{{ $t('layouts.public.brand') }}</span>
        </router-link>

        <div class="public-navbar__actions">
          <button
            class="btn btn-outline-primary public-navbar__menu-toggle d-inline-flex d-md-none"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#publicNavDrawer"
            aria-controls="publicNavDrawer"
            :aria-label="$t('layouts.public.openNav')"
          >
            <span class="navbar-toggler-icon" aria-hidden="true"></span>
          </button>

          <router-link
            v-if="!isLoginRoute"
            class="btn btn-outline-primary public-navbar__cta d-none d-md-inline-flex"
            :to="{ name: 'Login' }"
          >
            {{ $t('layouts.public.login') }}
          </router-link>
          <span
            v-else
            class="public-navbar__current d-none d-md-inline-flex"
            aria-current="page"
          >
            {{ $t('layouts.public.login') }}
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
          class="navbar-brand public-brand public-offcanvas__brand text-body text-decoration-none mb-0 d-inline-flex align-items-center gap-2"
          @click="navigateFromDrawer({ name: 'Landing' })"
        >
          <img src="/logo.png" alt="" class="public-brand__logo" aria-hidden="true">
          <span>{{ $t('layouts.public.brand') }}</span>
        </button>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="offcanvas"
          :aria-label="$t('layouts.public.closeNav')"
        ></button>
      </div>

      <div class="offcanvas-body public-offcanvas__body">
        <nav class="nav flex-column public-offcanvas__nav" :aria-label="$t('layouts.public.mobileNavLabel')">
          <button
            type="button"
            class="public-offcanvas__link"
            :class="{ 'is-active': route.name === 'Landing' }"
            @click="navigateFromDrawer({ name: 'Landing' })"
          >
            {{ $t('layouts.public.home') }}
          </button>

          <button
            v-if="!isLoginRoute"
            type="button"
            class="public-offcanvas__link"
            @click="navigateFromDrawer({ name: 'Login' })"
          >
            {{ $t('layouts.public.login') }}
          </button>
          <span v-else class="public-offcanvas__link is-active" aria-current="page">
            {{ $t('layouts.public.login') }}
          </span>
        </nav>
      </div>
    </div>

    <main id="public-main-content" tabindex="-1" class="public-layout__content flex-grow-1 d-flex flex-column">
      <router-view />
    </main>

    <footer class="public-footer mt-auto py-3 border-top border-secondary-subtle">
      <div class="container d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
        <div class="text-muted small text-center text-sm-start">
          {{ $t('layouts.public.copyright', { year: new Date().getFullYear() }) }}
        </div>
        <div class="d-flex align-items-center gap-3">
          <LocaleToggle :floating="false" />
          <ThemeToggle :floating="false" />
        </div>
      </div>
    </footer>
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

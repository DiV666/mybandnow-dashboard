<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useBandStore } from '../stores/useBandStore.js';
import { useMusicianStore } from '../stores/useMusicianStore.js';
import { useToastStore } from '../stores/useToastStore.js';
import { AxiosAuthRepository } from '../../infrastructure/auth/AxiosAuthRepository.js';
import { LoginUseCase } from '../../application/auth/LoginUseCase.js';
import { AuthToken } from '../../domain/auth/value-object/AuthToken.js';
import { useModalFocusTrap } from '../composables/useModalFocusTrap.js';

interface LoginErrorResponse {
  status?: number;
}

interface LoginErrorLike {
  response?: LoginErrorResponse;
}

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const bandStore = useBandStore();
const musicianStore = useMusicianStore();
const toastStore = useToastStore();

const authRepository = new AxiosAuthRepository();
const loginUseCase = new LoginUseCase(authRepository);

const password = ref('');
const isLoading = ref(false);

const countdown = ref(60);
let countdownInterval: number | null = null;
const modalRef = ref<HTMLElement | null>(null);
const isOpen = computed(() => authStore.isSessionExpired);

useModalFocusTrap(modalRef, isOpen);

const getEmailFromToken = (): string => {
  if (!authStore.token) return '';
  try {
    const authToken = new AuthToken(authStore.token);
    authToken.getExpirationTimeMs(); 
    
    const parts = authStore.token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = atob(base64);
      const payload = JSON.parse(jsonPayload) as { email?: string };
      return payload.email || '';
    }
  } catch {
    return '';
  }
  return '';
};

function isLoginErrorLike(error: unknown): error is LoginErrorLike {
  return typeof error === 'object' && error !== null && 'response' in error;
}

// Logouts
const manualLogout = () => {
  cleanUp();
  authStore.logout();
  bandStore.clear();
  musicianStore.clear();
  router.push({ name: 'Landing' });
};

const autoLogout = () => {
  cleanUp();
  authStore.logout();
  bandStore.clear();
  musicianStore.clear();
  router.push({ name: 'SessionClosed' });
};

const handleLogin = async () => {
  const email = getEmailFromToken();
  
  if (!email || !password.value) {
    toastStore.error(t('components.sessionExpired.errors.missingCredentials'));
    return;
  }

  isLoading.value = true;
  try {
    const newAuthToken = await loginUseCase.run(email, password.value);
    cleanUp();
    authStore.setToken(newAuthToken.value);
    password.value = '';
  } catch (error: unknown) {
    if (isLoginErrorLike(error) && error.response?.status === 401) {
      toastStore.error(t('components.sessionExpired.errors.invalidCredentials'));
    } else {
      toastStore.error(t('components.sessionExpired.errors.unexpected'));
    }
  } finally {
    isLoading.value = false;
  }
};

const cleanUp = () => {
  if (countdownInterval) clearInterval(countdownInterval);
  if (securityInterval) clearInterval(securityInterval);
};

let securityInterval: number | null = null;

const startSecurityObserver = () => {
  // En lugar de un MutationObserver (que se puede burlar inyectando clases CSS o borrando el backdrop),
  // usamos un Watchdog (perro guardián) continuo que verifica el estado real computado en el navegador cada 500ms.
  securityInterval = window.setInterval(() => {
    // 1. Verificamos que la modal siga existiendo en el DOM
    if (!modalRef.value || !document.body.contains(modalRef.value)) {
      console.warn('[Security] Modal eliminada del DOM. Cerrando sesión...');
      autoLogout();
      return;
    }

    // 2. Verificamos que no hayan ocultado la modal con CSS (clases inyectadas o estilos en línea)
    const modalStyle = window.getComputedStyle(modalRef.value);
    if (modalStyle.display === 'none' || modalStyle.visibility === 'hidden' || modalStyle.opacity === '0') {
      console.warn('[Security] Modal oculta por CSS. Cerrando sesión...');
      autoLogout();
      return;
    }

    // 3. Verificamos el fondo borroso (backdrop)
    const backdrop = document.querySelector('.modal-backdrop-blur');
    if (!backdrop) {
      console.warn('[Security] Fondo borroso eliminado. Cerrando sesión...');
      autoLogout();
      return;
    }

    const backdropStyle = window.getComputedStyle(backdrop);
    if (backdropStyle.display === 'none' || backdropStyle.visibility === 'hidden' || backdropStyle.opacity === '0') {
      console.warn('[Security] Fondo borroso oculto por CSS. Cerrando sesión...');
      autoLogout();
      return;
    }
    
    // 4. Verificamos que el backdrop-filter siga activo (algunos lo desactivan en DevTools para ver el fondo)
    const webkitBackdropFilter = 'webkitBackdropFilter' in backdropStyle
      ? backdropStyle.webkitBackdropFilter
      : undefined;
    if (backdropStyle.backdropFilter === 'none' && webkitBackdropFilter === 'none') {
      console.warn('[Security] Blur desactivado. Cerrando sesión...');
      autoLogout();
      return;
    }
  }, 500);
};

watch(() => authStore.isSessionExpired, async (isExpired) => {
  if (isExpired) {
    countdown.value = 60;
    
    // Iniciar cuenta atrás
    countdownInterval = window.setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        autoLogout();
      }
    }, 1000);

    // Esperar a que renderice la modal para atacarla con el observer
    await nextTick();
    startSecurityObserver();
  }
});

onUnmounted(() => {
  cleanUp();
});
</script>

<template>
  <div v-if="authStore.isSessionExpired" class="modal-backdrop-blur fade show"></div>
  
  <div 
    v-if="authStore.isSessionExpired" 
    ref="modalRef"
    class="session-expired-modal modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="session-expired-title"
  >
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg border-danger">
        <div class="modal-header bg-danger text-white">
          <h5 id="session-expired-title" class="modal-title">
            <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ $t('components.sessionExpired.title') }}
          </h5>
        </div>

        <div class="modal-body p-4">
          <p class="mb-4 text-center">
            {{ $t('components.sessionExpired.description') }}
          </p>

          <form @submit.prevent="handleLogin">
            <div class="mb-3">
              <label for="session-expired-email" class="form-label">{{ $t('components.sessionExpired.emailLabel') }}</label>
              <input id="session-expired-email" type="email" class="form-control" :value="getEmailFromToken()" disabled>
            </div>

            <div class="mb-4">
              <label for="session-expired-password" class="form-label">{{ $t('components.sessionExpired.passwordLabel') }}</label>
              <input
                id="session-expired-password"
                type="password"
                class="form-control"
                v-model="password"
                :placeholder="$t('components.sessionExpired.passwordPlaceholder')"
                required
                autofocus
              >
            </div>

            <div class="d-grid gap-2">
              <button type="submit" class="btn btn-primary" :disabled="isLoading">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ $t('components.sessionExpired.continueLabel') }}
              </button>

              <button type="button" class="btn btn-outline-secondary" @click="manualLogout" :disabled="isLoading">
                {{ $t('components.sessionExpired.manualLogout') }}
              </button>
            </div>
          </form>
        </div>

        <!-- Pie con la cuenta atrás -->
        <div class="modal-footer bg-body-tertiary justify-content-center p-2">
          <small class="text-body-secondary" style="font-size: 0.75rem;">
            <i18n-t keypath="components.sessionExpired.autoLogoutCountdown" tag="span">
              <template #seconds><strong class="text-danger">{{ countdown }}</strong></template>
            </i18n-t>
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop-blur {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: var(--rock-z-session-expired-backdrop);
  backdrop-filter: blur(25px) grayscale(50%);
  -webkit-backdrop-filter: blur(25px) grayscale(50%);
  background-color: rgba(255, 255, 255, 0.3);
}
.session-expired-modal {
  z-index: var(--rock-z-session-expired-modal);
  background-color: rgba(0, 0, 0, 0.4);
}
</style>

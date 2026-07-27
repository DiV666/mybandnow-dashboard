<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useToastStore } from '../../stores/useToastStore.js';
import { LoginUseCase } from '../../../application/auth/LoginUseCase.js';
import { AxiosAuthRepository } from '../../../infrastructure/auth/AxiosAuthRepository.js';

interface HttpErrorResponse {
  status?: number;
}

interface HttpErrorLike {
  response?: HttpErrorResponse;
}

const email = ref('');
const password = ref('');
const isLoading = ref(false);

const router = useRouter();
const authStore = useAuthStore();
const toastStore = useToastStore();

// Manual Dependency Injection for now
const authRepository = new AxiosAuthRepository();
const loginUseCase = new LoginUseCase(authRepository);

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  return typeof error === 'object' && error !== null && 'response' in error;
}

async function handleLogin() {
  if (!email.value || !password.value) {
    toastStore.error('Por favor, rellena todos los campos');
    return;
  }
  
  isLoading.value = true;
  
  try {
    const token = await loginUseCase.run(email.value, password.value);
    authStore.setToken(token.value);
    router.push('/dashboard');
  } catch (error: unknown) {
    if (isHttpErrorLike(error) && error.response?.status === 401) {
      toastStore.error('Credenciales inválidas');
    } else {
      toastStore.error('Ocurrió un error inesperado al iniciar sesión');
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <section class="login-shell">
    <div class="container py-4 py-lg-5">
      <div class="row justify-content-center align-items-center h-100 py-3">
        <div class="col-md-7 col-lg-5 col-xl-4">
          <div class="login-card card overflow-hidden">
            <div class="login-accent"></div>
            <div class="card-body p-4 p-lg-5">
              <div class="text-center mb-4">
                <span class="login-kicker text-uppercase">Backstage Access</span>
                <h2 class="mb-2 mt-3">Iniciar Sesión</h2>
                <p class="text-body-secondary mb-0">
                  Entrá a tu espacio y seguí construyendo videoclips con tu banda.
                </p>
              </div>

              <form @submit.prevent="handleLogin">
                <div class="mb-3">
                  <label for="email" class="form-label fw-semibold">Correo electrónico</label>
                  <input
                    type="email"
                    class="form-control login-input"
                    id="email"
                    v-model="email"
                    placeholder="user@example.com"
                    required
                    autocomplete="email"
                  >
                </div>

                <div class="mb-4">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <label for="password" class="form-label fw-semibold mb-0">Contraseña</label>
                    <small class="text-body-secondary">Acceso seguro</small>
                  </div>
                  <input
                    type="password"
                    class="form-control login-input"
                    id="password"
                    v-model="password"
                    placeholder="••••••••"
                    required
                    autocomplete="current-password"
                  >
                </div>

                <button
                  type="submit"
                  class="btn btn-primary w-100 login-submit"
                  :disabled="isLoading"
                >
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ isLoading ? 'Entrando...' : 'Entrar al backstage' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-shell {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 100%;
}

.login-accent {
  height: 0.45rem;
  background: linear-gradient(90deg, var(--bs-primary), var(--bs-warning, var(--bs-primary)));
}

.login-kicker {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: var(--bs-border-radius-pill);
  background-color: rgba(var(--rock-accent-tertiary-rgb), 0.12);
  color: var(--rock-accent-tertiary);
  box-shadow: inset 0 0 0 1px rgba(var(--rock-accent-tertiary-rgb), 0.28);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.login-submit {
  border-radius: var(--bs-border-radius-pill);
}
</style>

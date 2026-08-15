<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useToastStore } from '../../stores/useToastStore.js';
import { container } from '../../bootstrap/container.js';
import { isHttpErrorLike } from '../../utils/httpError.js';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const isPasswordVisible = ref(false);

const router = useRouter();
const authStore = useAuthStore();
const toastStore = useToastStore();
const { t } = useI18n();

const { loginUseCase } = container.useCases;

async function handleLogin() {
  if (!email.value || !password.value) {
    toastStore.error(t('auth.login.errors.emptyFields'));
    return;
  }
  
  isLoading.value = true;
  
  try {
    const token = await loginUseCase.run(email.value, password.value);
    authStore.setToken(token.value);
    router.push('/dashboard');
  } catch (error: unknown) {
    if (isHttpErrorLike(error) && error.response?.status === 401) {
      toastStore.error(t('auth.login.errors.invalidCredentials'));
    } else {
      toastStore.error(t('auth.login.errors.unexpected'));
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <section class="login-shell" :aria-label="$t('auth.login.title')">
    <div class="container py-4 py-lg-5">
      <div class="row justify-content-center align-items-center h-100 py-3">
        <div class="col-md-7 col-lg-5 col-xl-4">
          <div class="login-card card overflow-hidden">
            <div class="login-accent"></div>
            <div class="card-body p-4 p-lg-5">
              <div class="text-center mb-4">
                <span class="login-kicker text-uppercase">{{ $t('auth.login.kicker') }}</span>
                <h2 class="mb-2 mt-3">{{ $t('auth.login.title') }}</h2>
                <p class="text-body-secondary mb-0">
                  {{ $t('auth.login.description') }}
                </p>
              </div>

              <form @submit.prevent="handleLogin">
                <div class="mb-3">
                  <label for="email" class="form-label fw-semibold">{{ $t('auth.login.email') }}</label>
                  <input
                    type="email"
                    class="form-control login-input"
                    id="email"
                    v-model="email"
                    :placeholder="$t('auth.login.emailPlaceholder')"
                    required
                    autocomplete="email"
                  >
                </div>

                <div class="mb-4">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <label for="password" class="form-label fw-semibold mb-0">{{ $t('auth.login.password') }}</label>
                    <small class="text-body-secondary">{{ $t('auth.login.passwordHelp') }}</small>
                  </div>
                  <div class="input-group">
                    <input
                      :type="isPasswordVisible ? 'text' : 'password'"
                      class="form-control login-input"
                      id="password"
                      v-model="password"
                      :placeholder="$t('auth.login.passwordPlaceholder')"
                      required
                      autocomplete="current-password"
                    >
                    <button
                      type="button"
                      class="btn btn-outline-secondary login-password-toggle"
                      @click="isPasswordVisible = !isPasswordVisible"
                      :aria-label="isPasswordVisible ? $t('auth.login.hidePassword') : $t('auth.login.showPassword')"
                      :aria-pressed="isPasswordVisible"
                    >
                      <i class="bi" :class="isPasswordVisible ? 'bi-eye-slash' : 'bi-eye'" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  class="btn btn-primary w-100 login-submit"
                  :disabled="isLoading"
                  aria-live="polite"
                >
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ isLoading ? $t('auth.login.submitLoading') : $t('auth.login.submit') }}
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
  background: linear-gradient(90deg, var(--bs-primary), var(--rock-accent-tertiary));
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

.login-password-toggle {
  border-color: var(--bs-border-color);
}
</style>

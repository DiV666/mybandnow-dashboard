<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { LoginUseCase } from '../../../application/auth/LoginUseCase.js';
import { AxiosAuthRepository } from '../../../infrastructure/auth/AxiosAuthRepository.js';

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

const router = useRouter();
const authStore = useAuthStore();

// Manual Dependency Injection for now
const authRepository = new AxiosAuthRepository();
const loginUseCase = new LoginUseCase(authRepository);

async function handleLogin() {
  errorMsg.value = '';
  
  if (!email.value || !password.value) {
    errorMsg.value = 'Por favor, rellena todos los campos';
    return;
  }
  
  isLoading.value = true;
  
  try {
    const token = await loginUseCase.run(email.value, password.value);
    authStore.setToken(token.value);
    router.push('/dashboard');
  } catch (error: any) {
    if (error.response?.status === 401) {
      errorMsg.value = 'Credenciales inválidas';
    } else {
      errorMsg.value = 'Ocurrió un error inesperado al iniciar sesión';
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h2 class="text-center mb-4">Iniciar Sesión</h2>
            
            <div v-if="errorMsg" class="alert alert-danger" role="alert">
              {{ errorMsg }}
            </div>
            
            <form @submit.prevent="handleLogin">
              <div class="mb-3">
                <label for="email" class="form-label">Correo electrónico</label>
                <input 
                  type="email" 
                  class="form-control" 
                  id="email" 
                  v-model="email"
                  placeholder="user@example.com"
                  required
                >
              </div>
              
              <div class="mb-4">
                <label for="password" class="form-label">Contraseña</label>
                <input 
                  type="password" 
                  class="form-control" 
                  id="password" 
                  v-model="password"
                  required
                >
              </div>
              
              <button 
                type="submit" 
                class="btn btn-primary w-100" 
                :disabled="isLoading"
              >
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ isLoading ? 'Entrando...' : 'Entrar' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

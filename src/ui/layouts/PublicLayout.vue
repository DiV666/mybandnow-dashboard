<template>
  <div class="public-layout">
    <!-- Navbar público básico -->
    <nav class="navbar navbar-expand-lg surface-container border-bottom shadow-sm">
      <div class="container">
        <router-link class="navbar-brand fw-bold text-body text-decoration-none" :to="{ name: 'Landing' }">Mybandnow</router-link>
        <div>
          <router-link class="btn btn-outline-primary" :to="{ name: 'Login' }">Iniciar Sesión</router-link>
        </div>
      </div>
    </nav>
    <!-- Contenido dinámico público -->
    <router-view />
  </div>
</template>

<script setup lang="ts">
// Lógica del layout público si es necesaria
</script>

import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
// Importamos Layouts para agrupar vistas
import PublicLayout from '../layouts/PublicLayout.vue';
import DashboardLayout from '../layouts/DashboardLayout.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      {
        path: '',
        name: 'Landing',
        component: () => import('../views/public/LandingView.vue'),
      },
      {
        path: 'login',
        name: 'Login',
        component: () => import('../views/public/LoginView.vue'),
      },
    ],
  },
  {
    path: '/dashboard',
    component: DashboardLayout, // Todo lo que esté aquí dentro tendrá el Sidebar
    meta: { requiresAuth: true }, // ¡Bloqueo de seguridad!
    children: [
      {
        path: '',
        name: 'DashboardHome',
        component: () => import('../views/dashboard/DashboardHomeView.vue'),
      },
      {
        path: 'bands',
        name: 'BandsManager',
        component: () => import('../views/dashboard/BandsView.vue'),
      },
      {
        path: 'members',
        name: 'MembersManager',
        component: () => import('../views/dashboard/MembersView.vue'),
      },
      {
        path: 'songs',
        name: 'SongsManager',
        component: () => import('../views/dashboard/SongsView.vue'),
      },
      {
        path: 'videoclips',
        name: 'VideoclipsManager',
        component: () => import('../views/dashboard/VideoclipsView.vue'),
      }
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation Guard básico para proteger el dashboard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  // TODO: Conectar esto con tu store de autenticación (ej. Pinia)
  const isAuthenticated = true; // MOCK DE AUTENTICACIÓN A TRUE PARA PODER VER EL DASHBOARD DURANTE EL DESARROLLO

  if (requiresAuth && !isAuthenticated) {
    next({ name: 'Login' }); // Patada al login
  } else {
    next(); // Adelante
  }
});

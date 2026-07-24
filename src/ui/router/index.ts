import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
// Import layouts to group related views.
import PublicLayout from "../layouts/PublicLayout.vue";
import DashboardLayout from "../layouts/DashboardLayout.vue";

const routes: Array<RouteRecordRaw> = [
	{
		path: "/",
		component: PublicLayout,
		children: [
			{
				path: "",
				name: "Landing",
				component: () => import("../views/public/LandingView.vue"),
			},
			{
				path: "login",
				name: "Login",
				component: () => import("../views/auth/LoginView.vue"),
			},
		],
	},
	{
		path: "/session-closed",
		name: "SessionClosed",
		component: () => import("../views/SessionClosedView.vue"),
	},
	{
		path: "/dashboard",
		component: DashboardLayout, // All nested routes render inside the dashboard shell.
		meta: { requiresAuth: true }, // Protect the dashboard behind authentication.
		children: [
			{
				path: "",
				redirect: { name: "SongsManager" },
			},
			{
				path: "create-first-band",
				name: "CreateFirstBand",
				component: () =>
					import("../views/dashboard/band/CreateFirstBandView.vue"),
			},
			{
				path: "members",
				name: "MembersManager",
				component: () => import("../views/dashboard/MembersView.vue"),
			},
			{
				path: "profile",
				name: "Profile",
				component: () => import("../views/dashboard/ProfileView.vue"),
			},
			{
				path: "songs",
				name: "SongsManager",
				component: () => import("../views/dashboard/SongsView.vue"),
			},
			{
				path: "songs/:songId/tracks",
				name: "SongTrackEditor",
				component: () => import("../views/dashboard/SongTrackEditorView.vue"),
			},
			{
				path: "videoclips",
				name: "VideoclipsManager",
				component: () => import("../views/dashboard/VideoclipsView.vue"),
			},
		],
	},
];

export const router = createRouter({
	history: createWebHistory(),
	routes,
});

import { useAuthStore } from "../stores/useAuthStore.js";

// Basic navigation guard for authenticated dashboard routes.
router.beforeEach((to, _from, next) => {
	const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

	// Use the real authentication store state.
	const authStore = useAuthStore();
	const isAuthenticated = authStore.isAuthenticated;

	if (requiresAuth && !isAuthenticated) {
		next({ name: "Login" }); // Redirect unauthenticated users to login.
	} else {
		next(); // Allow the navigation.
	}
});

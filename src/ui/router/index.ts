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
				meta: {
					titleKey: "public.landing.title",
					descriptionKey: "public.landing.description",
				},
			},
			{
				path: "login",
				name: "Login",
				component: () => import("../views/auth/LoginView.vue"),
				meta: {
					titleKey: "auth.login.title",
					descriptionKey: "auth.login.description",
				},
			},
		],
	},
	{
		path: "/session-closed",
		name: "SessionClosed",
		component: () => import("../views/SessionClosedView.vue"),
		meta: {
			titleKey: "views.sessionClosed.title",
			descriptionKey: "views.sessionClosed.description",
		},
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
				meta: {
					titleKey: "views.createFirstBand.pageTitle",
					descriptionKey: "views.createFirstBand.description",
				},
			},
			{
				path: "members",
				name: "MembersManager",
				component: () => import("../views/dashboard/MembersView.vue"),
				meta: {
					titleKey: "views.members.title",
					descriptionKey: "views.members.description",
				},
			},
			{
				path: "profile",
				name: "Profile",
				component: () => import("../views/dashboard/ProfileView.vue"),
				meta: {
					titleKey: "views.profile.title",
					descriptionKey: "views.profile.description",
				},
			},
			{
				path: "songs",
				name: "SongsManager",
				component: () => import("../views/dashboard/SongsView.vue"),
				meta: {
					titleKey: "dashboard.songs.pageTitle",
					descriptionKey: "dashboard.songs.pageDescription",
				},
			},
			{
				path: "songs/:songId/tracks",
				name: "SongTrackEditor",
				component: () => import("../views/dashboard/SongTrackEditorView.vue"),
				// Title is set dynamically from the song name (see useDocumentMeta) since
				// each song gets its own tab title instead of a fixed one.
				meta: {
					descriptionKey: "dashboard.trackEditor.subtitle",
				},
			},
			{
				path: "videoclips",
				name: "VideoclipsManager",
				component: () => import("../views/dashboard/VideoclipsView.vue"),
				meta: {
					titleKey: "views.videoclips.title",
					descriptionKey: "views.videoclips.pageDescription",
				},
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
router.beforeEach((to) => {
	const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

	// Use the real authentication store state.
	const authStore = useAuthStore();
	const isAuthenticated = authStore.isAuthenticated;

	if (requiresAuth && !isAuthenticated) {
		return { name: "Login" }; // Redirect unauthenticated users to login.
	}

	return true; // Allow the navigation.
});

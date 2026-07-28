<template>
	<div class="locale-toggle" :class="floating ? 'locale-toggle-floating dropup' : 'locale-toggle-inline dropdown'">
		<button
			type="button"
			class="btn btn-sm dropdown-toggle locale-toggle-btn"
			:class="buttonClass"
			data-bs-toggle="dropdown"
			aria-expanded="false"
			:aria-label="`Seleccionar idioma (actual: ${localeMeta[currentLocale]?.name})`"
		>
			<span aria-hidden="true" class="locale-flag" v-html="localeMeta[currentLocale]?.flag"></span>
		</button>
		<ul class="dropdown-menu shadow-sm">
			<li v-for="locale in locales" :key="locale">
				<button class="dropdown-item d-flex align-items-center gap-2 fw-bold" :class="{ active: currentLocale === locale }" @click="changeLocale(locale)">
					<span aria-hidden="true" class="locale-flag" v-html="localeMeta[locale]?.flag"></span>
					<span>{{ localeMeta[locale]?.name }}</span>
				</button>
			</li>
		</ul>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(defineProps<{
	floating?: boolean;
}>(), {
	floating: true
});
import { getCurrentTheme, THEMES } from "../theme/theme.js";

const { locale: currentLocale, availableLocales: locales } = useI18n();

const changeLocale = (newLocale: string) => {
	currentLocale.value = newLocale;
};

const buttonClass = computed(() => {
	const isDark = document.documentElement.getAttribute("data-bs-theme") === THEMES.dark;
	return isDark ? "locale-btn-dark" : "locale-btn-light";
});

const localeMeta: Record<string, { name: string; flag: string }> = {
	es: {
		name: "Español",
		flag: `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/></svg>`
	},
	en: {
		name: "English",
		flag: `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#00247D"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" stroke-width="4"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#CF142B" stroke-width="2"/><path d="M15,0 V20 M0,10 H30" stroke="#fff" stroke-width="6"/><path d="M15,0 V20 M0,10 H30" stroke="#CF142B" stroke-width="3.5"/></svg>`
	},
	ca: {
		name: "Català",
		flag: `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#FCDD09"/><rect y="2.22" width="30" height="2.22" fill="#DA121A"/><rect y="6.67" width="30" height="2.22" fill="#DA121A"/><rect y="11.11" width="30" height="2.22" fill="#DA121A"/><rect y="15.56" width="30" height="2.22" fill="#DA121A"/></svg>`
	},
	gl: {
		name: "Galego",
		flag: `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#fff"/><polygon points="0,0 8,0 30,16 30,20 22,20 0,4" fill="#0090D2"/></svg>`
	},
	eu: {
		name: "Euskera",
		flag: `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#D52B1E"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#009B48" stroke-width="4"/><path d="M15,0 V20 M0,10 H30" stroke="#fff" stroke-width="4"/></svg>`
	}
};
</script>

<style scoped>
.locale-toggle-floating {
	position: fixed;
	right: 1rem;
	bottom: 4.25rem;
	z-index: var(--rock-z-floating-control);
}

.locale-toggle-btn {
	width: 2.75rem;
	height: 2.75rem;
	min-height: 2.75rem;
	padding: 0;
	border-width: 1px;
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background-color: color-mix(in srgb, var(--bs-body-bg) 88%, transparent);
	backdrop-filter: blur(8px);
	box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(var(--rock-accent-tertiary-rgb), 0.35);
	color: var(--bs-body-color);
	border-color: var(--bs-border-color);
	transition: all var(--rock-interaction-transition);
}

.locale-toggle-btn:hover,
.locale-toggle-btn:focus-visible,
.locale-toggle-btn[aria-expanded="true"] {
	background-color: var(--bs-secondary-bg-subtle);
	color: var(--bs-body-color);
	border-color: var(--rock-accent-tertiary);
}

.locale-flag {
	display: inline-flex;
	width: 1.25rem;
	height: auto;
	line-height: 0;
	border-radius: 0.15rem;
	overflow: hidden;
	box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
	flex-shrink: 0;
}

.locale-flag :deep(svg) {
	display: block;
	width: 100%;
	height: auto;
}

.locale-toggle.dropup .dropdown-menu {
	margin-bottom: 0.5rem;
}

.dropdown-toggle::after {
	display: none;
}
</style>

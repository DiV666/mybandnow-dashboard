<template>
	<div class="locale-toggle" :class="floating ? 'locale-toggle-floating dropup' : 'locale-toggle-inline dropdown'">
		<button
			type="button"
			class="btn btn-sm dropdown-toggle locale-toggle-btn"
			:class="buttonClass"
			data-bs-toggle="dropdown"
			aria-expanded="false"
			aria-label="Seleccionar idioma"
		>
			<span aria-hidden="true" class="text-uppercase">{{ currentLocale }}</span>
		</button>
		<ul class="dropdown-menu shadow-sm">
			<li v-for="locale in locales" :key="locale">
				<button class="dropdown-item text-uppercase text-center fw-bold" :class="{ active: currentLocale === locale }" @click="changeLocale(locale)">
					{{ locale }}
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

.locale-toggle-btn span {
	font-size: 0.8rem;
	line-height: 1;
	font-weight: bold;
}

.locale-toggle.dropup .dropdown-menu {
	margin-bottom: 0.5rem;
}

.dropdown-toggle::after {
	display: none;
}
</style>

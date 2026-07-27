<template>
	<div class="locale-toggle dropup" :class="floating ? 'locale-toggle-floating' : 'locale-toggle-inline'" ref="containerRef">
		<button
			type="button"
			class="btn btn-sm dropdown-toggle locale-toggle-btn"
			:class="buttonClass"
			:aria-expanded="isOpen"
			aria-label="Seleccionar idioma"
			@click="toggleDropdown"
		>
			<span aria-hidden="true" class="text-uppercase">{{ currentLocale }}</span>
		</button>
		<ul class="dropdown-menu dropdown-menu-end shadow-sm" :class="{ show: isOpen }">
			<li v-for="locale in locales" :key="locale">
				<button class="dropdown-item text-uppercase text-center fw-bold" :class="{ active: currentLocale === locale }" @click="changeLocale(locale)">
					{{ locale }}
				</button>
			</li>
		</ul>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(defineProps<{
	floating?: boolean;
}>(), {
	floating: true
});
import { getCurrentTheme, THEMES } from "../theme/theme.js";

const { locale: currentLocale, availableLocales: locales } = useI18n();
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const changeLocale = (newLocale: string) => {
	currentLocale.value = newLocale;
	isOpen.value = false;
};

const toggleDropdown = () => {
	isOpen.value = !isOpen.value;
};

const closeDropdown = (event: MouseEvent) => {
	if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
		isOpen.value = false;
	}
};

onMounted(() => {
	document.addEventListener('click', closeDropdown);
});

onBeforeUnmount(() => {
	document.removeEventListener('click', closeDropdown);
});

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

.locale-toggle .dropdown-menu {
	bottom: 100%;
	top: auto;
	right: 0;
	left: auto;
	margin-bottom: 0.5rem;
}

.dropdown-toggle::after {
	display: none;
}
</style>
